import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import readXlsxFile from "read-excel-file/node";
import { Deployment } from "src/entities/deployment.entity";
import { Language, ProjectLanguage } from "src/entities/language.entity";
import { Message, MessageLanguages } from "src/entities/message.entity";
import { Playlist } from "src/entities/playlist.entity";
import { Program } from "src/entities/program.entity";
import { Project } from "src/entities/project.entity";
import { Recipient } from "src/entities/recipient.entity";
import { User } from "src/entities/user.entity";
import { FindOptionsWhere } from "typeorm";
import { DataSource, In, EntityManager } from "typeorm";

@Injectable()
export class ProgramSpecService {
  constructor(private dataSource: DataSource) { }

  async findByCode(code: string, user?: User): Promise<Project> {
    const query: FindOptionsWhere<Project> =
      user == null
        ? { code: code }
        : {
          code: code,
          program: { users: { user_id: user.id } },
        };

    const found = await Project.findOne({
      where: query,
      relations: {
        general: true,
        recipients: true,
        deployments: { playlists: { messages: true } },
        languages: true,
      },
    });

    if (found == null) {
      throw new NotFoundException("Program not found");
    }

    return found;
  }

  async updateProgram(
    dto: {
      general: Record<string, any>;
      languages: Record<string, any>;
      recipients: Record<string, any>[];
      deployments: Record<string, any>[];
      contents: Record<string, any>[];
    },
    code: string,
  ) {
    // TODO: add 'languages' field to request data
    // TODO: make sure request matches the db model
    const program = await this.findByCode(code);
    console.log(dto.general.languages);
    const languages = new Set<string>(
      ...(
        await Language.find({
          where: { code: In(dto.general.languages || []) },
        })
      ).map((i) => i.code),
      ...(
        await ProjectLanguage.find({
          where: { code: In(dto.general.languages || []), projectcode: code },
        })
      ).map((i) => i.code),
    );

    await this.dataSource.manager.transaction(async (manager) => {
      // Save general
      // TODO: set languages data from request
      delete dto.general.id;
      await this.saveGeneralInfo(
        dto.general,
        Array.from(languages),
        program.general,
        manager,
      );

      // Save deployments
      await this.saveDeployments(manager, dto.deployments, program.general);

      // Playlists
      await manager
        .createQueryBuilder()
        .insert()
        .into(Playlist)
        .values(
          dto.deployments.flatMap((d) =>
            d.playlists.flatMap((p) => {
              p.program_id = program.code;
              return p;
            }),
          ),
        )
        .orIgnore()
        .execute();

      // Save messages
      const playlists = await manager.find(Playlist, {
        where: { program_id: code },
      }); // fetch updated playlists
      const _reqMessages = dto.deployments.flatMap((row) => {
        return row.playlists.flatMap((pl, index) => {
          const _found = playlists.find(
            (p) =>
              p.id === pl.id ||
              (p.title === pl.title && p.deployment_id === pl.deployment_id),
          );
          if (_found == null) {
            throw new BadRequestException(
              `Playlist id cannot be found for #${index + 1}`,
            );
          }

          return pl.messages.map((m) => {
            m.program_id = program.code;
            m.playlist_id = _found.id;
            return m;
          });
        });
      });

      await manager
        .createQueryBuilder()
        .insert()
        .into(Message)
        .values(_reqMessages)
        .orIgnore()
        .execute();

      // Save Message languages
      console.log(code);
      const messages = await manager.find(Message, {
        where: { program_id: code },
        relations: { playlist: { deployment: true } },
        select: {
          playlist: { title: true, deployment: { deploymentnumber: true } },
        },
      });
      await manager
        .createQueryBuilder()
        .insert()
        .into(MessageLanguages)
        .values(
          _reqMessages.flatMap((row) => {
            const msg = messages.find(
              (m) =>
                m.id === row.id ||
                (m.title === row.title && m.playlist_id === row.playlist_id),
            );

            if (msg == null) {
              throw new BadRequestException(
                `'${row.title}' message cannot be matched to any existing messages`,
              );
            }

            if (row.languages == null) {
              console.log(row);
              throw new BadRequestException(
                `No language(s) is set for '${msg.title}' message`,
              );
            }

            return (row.languages.split(",") as string[])
              .filter((l) => l.trim() !== "")
              .map((code) => {
                if (!languages.has(code)) {
                  throw new BadRequestException(
                    `Language code '${code}' of '${msg?.title}' message not found in the 'Languages' sheet`,
                  );
                }

                const item = new MessageLanguages();
                item.language_code = code;
                item.message_id = msg!.id;
                return item;
              });
          }),
        )
        .orIgnore()
        .execute();
      // console.log(dto.deployments[0].playlists[0]);
    });
  }

  async import(file: Express.Multer.File, code: string) {
    console.log("hereere");
    const {
      rows: [general],
      errors: errors1,
    } = await readXlsxFile(file.buffer, {
      // @ts-ignore
      schema: GENERAL_SCHEMA,
      sheet: "General",
    });
    if (errors1.length > 0) {
      throw new BadRequestException(this.formatParsingError(errors1[0]));
    }

    const { rows: deployments, errors: errors2 } = await readXlsxFile(
      file.buffer,
      { schema: DEPLOYMENTS_SCHEMA, sheet: "Deployments" },
    );
    if (errors2.length > 0) {
      throw new BadRequestException(this.formatParsingError(errors2[0]));
    }

    const { rows: contents, errors: err3 } = await readXlsxFile(file.buffer, {
      schema: CONTENT_SCHEMA,
      sheet: "Content",
    });
    if (err3.length > 0) {
      throw new BadRequestException(this.formatParsingError(err3[0]));
    }

    const { rows: recipients, errors: err4 } = await readXlsxFile(file.buffer, {
      schema: RECIPIENT_SCHEMA,
      sheet: "Recipients",
    });
    if (err4.length > 0) {
      throw new BadRequestException(this.formatParsingError(err4[0]));
    }

    const { rows: languages, errors: err5 } = await readXlsxFile(file.buffer, {
      schema: LANGUAGE_SCHEMA,
      sheet: "Languages",
    });
    if (err5.length > 0) {
      throw new BadRequestException(this.formatParsingError(err5[0]));
    }

    // Save to db
    await this.dataSource.manager.transaction(
      "READ UNCOMMITTED",
      async (manager) => {
        const program = (await this.findByCode(code)).general;
        const allDeployments = await manager.find(Deployment, {
          where: { project_id: general.program_id as string },
        });

        // Save languages
        await manager.upsert(
          ProjectLanguage,
          languages.map((l) => {
            l.projectcode = program.program_id;
            return l;
          }) as unknown as ProjectLanguage[],
          ["code", "name", "projectcode"],
        );

        // Save program info
        await this.saveGeneralInfo(
          general,
          languages.flatMap((i) => i.code as string),
          program,
          manager,
        );

        // Save deployments
        await this.saveDeployments(manager, deployments, program);

        //
        // Save content
        //
        // Playlists
        const data = contents.map((row, index) => {
          const values = `('${program.program_id}', '${allDeployments.find((i) => i.deploymentnumber === row.deployment_number)?.id}', '${index + 1}', '${row.playlist_title}', '${row.audience}')`;
          return `
        INSERT INTO "playlists"("program_id", "deployment_id", "position", "title", "audience")
        VALUES ${values}
        ON CONFLICT("program_id", "deployment_id", "title") DO UPDATE SET "position" = EXCLUDED."position", "audience" = EXCLUDED."audience";`;
        });
        await manager.query(data.join("\n"));

        // Messages
        const playlists = await manager.getRepository(Playlist).find({
          where: { program_id: program.program_id },
          relations: { deployment: true },
          select: {
            deployment: { deploymentnumber: true },
          },
        });
        const messagesQuery = contents.map((row, index) => {
          const pId = playlists.find(
            (i) =>
              i.title === row.playlist_title &&
              i.deployment.deploymentnumber === row.deployment_number,
          )!.id;
          const sdgId = (row.sdg_goals as string).split(
            ",",
          )[0] as unknown as number; // pick the first goal if multiple

          const values = `('${row.message_title}', '${program.program_id}', ${pId}, '${index + 1}', '${row.format}', ${row.default_category ?? "null"}, '${row.variant ?? ''}', '${row.key_points ?? ''}', '${sdgId}', '${row.sdg_targets ?? ''}')`;
          return `
        INSERT INTO "messages"(
         "title", "program_id", "playlist_id", "position", "format", "default_category_code",
          "variant", "key_points", "sdg_goal_id", "sdg_target_id"
         )
        VALUES ${values}
        ON CONFLICT("program_id", "playlist_id", "title") DO UPDATE SET "position" = EXCLUDED."position", "title" = EXCLUDED."title", "format" = EXCLUDED."format", "default_category_code" = EXCLUDED."default_category_code", "variant" = EXCLUDED."variant", "key_points" = EXCLUDED."key_points", "sdg_goal_id" = EXCLUDED."sdg_goal_id", "sdg_target_id" = EXCLUDED."sdg_target_id";`;
        });
        await manager.query(messagesQuery.join("\n"));

        // Message languages

        // First, we need to make sure that all message languages are captured on the "Languages" sheet
        const set1 = new Set<string>(
          languages.flatMap((row) => row.code as string),
        );

        const messages = await manager.getRepository(Message).find({
          where: { program_id: program.program_id },
          relations: { playlist: { deployment: true } },
          select: {
            playlist: { title: true, deployment: { deploymentnumber: true } },
          },
        });
        console.log(messages);
        await manager
          .createQueryBuilder()
          .insert()
          .into(MessageLanguages)
          .values(
            contents.flatMap((row, index) => {
              const msg = messages.find(
                (m) =>
                  m.title === row.message_title &&
                  m.playlist.title === row.playlist_title &&
                  m.playlist.deployment.deploymentnumber ===
                  row.deployment_number,
              );

              if (msg == null) {
                console.log(msg, row);
                throw new BadRequestException(
                  `Message '${row.message_title}' differ from what is already in the spec`,
                );
              }

              return (row.languages as string[]).map((code) => {
                if (!set1.has(code)) {
                  throw new BadRequestException(
                    `Language code '${code}' of '${msg?.title}' message not found in the 'Languages' sheet`,
                  );
                }

                const item = new MessageLanguages();
                item.language_code = code;
                item.message_id = msg!.id;
                return item;
              });
            }),
          )
          // .orIgnore()
          .execute();

        // Save recipients
        await manager
          .createQueryBuilder()
          .insert()
          .into(Recipient)
          .values(
            recipients.map((row, index) => {
              row.program_id = program.program_id;
              row.num_households ??= 0;

              if (row.recipient_id == null || row.recipient_id === "") {
                delete row.recipient_id;
              }

              if (!set1.has(row.language as string)) {
                throw new BadRequestException(
                  `Language code '${row.language}' of recipient on row '${index + 1}' not found in the 'Languages' sheet`,
                );
              }

              return row as unknown as Recipient;
            }),
          )
          .orIgnore()
          .execute();

        // console.log(messages);
        // insert message languages
        // recipiuents
        // as unknown as Playlist[], {
        //   conflictPaths: ['title', 'deployment_id', 'program_id'],
        //   skipUpdateIfNoValuesChanged: true
        // }
        // )

        // await manager.upsert(Message, contents.map((row, index) => {
        //   const item = new Playlist()
        //   item.title = row.playlist_title as string
        //   item.program_id = program.program_id
        //   item.deployment_id = allDeployments.find(i => i.deploymentnumber === row.deployment_number)?.id
        //   item.position = index + 1
        //   item.audience = row.audience as string
        //   return item
        // }) as unknown as Playlist[], ['title', 'deployment_id', 'program_id'])
      });
  }

  private async saveDeployments(
    manager: EntityManager,
    deployments: Record<string, any>[],
    program: Program,
  ) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Deployment)
      .values(
        deployments.map((row) => {
          row.project_id = program.program_id;
          row.deploymentname = row.deployment;
          return row;
        }) as unknown as Deployment[],
      )
      .orIgnore()
      .execute();
  }

  private async saveGeneralInfo(
    general: Record<string, any>,
    languages: string[],
    program: Program,
    manager: EntityManager,
  ) {
    general.program_id ??= program.program_id;
    general.project_id ??= program.project_id;
    general.languages = languages;
    await manager.upsert(Program, general, ["program_id"]);
  }

  private formatParsingError(opts: {
    error: string;
    row: number;
    column: string;
    value?: any;
  }) {
    return `${opts.error} at row ${opts.row}, column ${opts.column} with value '${opts.value}'`;
  }
}

const errorMessageSuffix = "Please correct all errors and re-upload the sheet";
const parseJson = (value: string, error: string) => {
  try {
    return JSON.parse(value.replace(/'/g, '"'));
  } catch (err) {
    console.log(err);
    throw new BadRequestException(`${error}. ${errorMessageSuffix}`);
  }
};

const LANGUAGE_SCHEMA = {
  name: { prop: "name", type: String, required: true },
  code: { prop: "code", type: String, required: true },
};

const RECIPIENT_SCHEMA = {
  Country: { prop: "country", type: String, required: true },
  Region: { prop: "region", type: String, required: true },
  District: { prop: "district", type: String, required: true },
  Community: { prop: "community_name", type: String, required: false },
  Agent: { prop: "agent", type: String, required: true },
  "Language Code": { prop: "language", type: String, required: true },
  "Group Name": { prop: "group_name", type: String, required: false },
  "Group Size": { prop: "group_size", type: Number, required: false },
  "# HH": { prop: "num_households", type: Number, required: false },
  "# TBs": { prop: "num_tbs", type: Number, required: false },
  "Direct Beneficiaries": {
    prop: "direct_beneficiaries",
    type: Number,
    required: false,
  },
  "Indirect Beneficiaries": {
    prop: "indirect_beneficiaries",
    type: Number,
    required: false,
  },
  Variant: { prop: "variant", type: String, required: false },
  "Support Entity": { prop: "support_entity", type: String, required: false },
  "Agent Gender": { prop: "agent_gender", type: String, required: false },
  "Listening Model": { prop: "listening_model", type: String, required: false },
  "Direct Beneficiaries Additional": {
    prop: "direct_beneficiaries_additional",
    required: false,
    type: (value) =>
      parseJson(
        value,
        "The format of 'Direct Beneficiaries Additional' column in 'Recipients' workbook is wrong",
      ),
  },
  Affiliate: { prop: "affiliate", type: String, required: false },
  Partner: { prop: "partner", type: String, required: false },
  Components: { prop: "component", type: String, required: false },
  RecipientID: { prop: "recipient_id", type: String, required: false },
  Deployments: {
    prop: "deployments",
    type: (value) =>
      parseJson(
        value,
        "The format of 'Deployment' column in 'Recipient' workbook is wrong",
      ),
    required: false,
  },
};

const CONTENT_SCHEMA = {
  "Deployment #": { prop: "deployment_number", type: Number, required: true },
  "Playlist Title": { prop: "playlist_title", type: String, required: true },
  "Message Title": { prop: "message_title", type: String, required: true },
  "Key Points": { prop: "key_points", type: String, required: false },
  "Language Code": {
    required: true,
    prop: "languages",
    type: (value) => {
      try {
        return parseJson(
          value,
          `The format of '${value}' in 'Language Code' column of 'Content' workbook is wrong`,
        ); // value in brackets; eg. ["eng", "fr"]
      } catch (error) {
        try {
          return value.split(",").map((v) => v.trim()); // raw strings; eg. en, fr
        } catch {
          throw new BadRequestException(`${error}. ${errorMessageSuffix}`);
        }
      }
    },
  },
  Variant: { prop: "variant", type: String, required: false },
  Format: { prop: "format", type: String, required: false },
  Audience: { prop: "audience", type: String, required: false },
  "Default Category": {
    prop: "default_category",
    type: String,
    required: false,
  },
  "SDG Goals": { prop: "sdg_goals", type: String, required: false },
  "SDG Targets": { prop: "sdg_targets", type: String, required: false },
};

const DEPLOYMENTS_SCHEMA = {
  "Deployment #": { prop: "deploymentnumber", type: Number, required: true },
  "Start Date": { prop: "start_date", type: Date, required: true },
  "End Date": { prop: "end_date", type: Date, required: true },
  "Deployment Name": { prop: "deployment", type: String, required: true },
};

const GENERAL_SCHEMA = {
  "Program ID": { prop: "program_id", type: String, required: true },
  Country: { prop: "country", type: String, required: true },
  Affiliate: { prop: "affiliate", type: String, required: false },
  Partner: { prop: "partner", type: String, required: false },
  Regions: {
    prop: "region",
    type: (value: string) =>
      parseJson(
        value,
        "The format of 'Regions' column in 'General' workbook is wrong",
      ),
    required: true,
  },
  // "Languages": {
  //   prop: 'languages',
  //   type: (value) => parseJson(value, "The format of 'Languages' column in 'General' workbook is wrong"),
  //   required: true
  // },
  "Deployments Count": {
    prop: "deployments_count",
    type: Number,
    required: true,
  },
  "Deployments Length": {
    prop: "deployments_length",
    type: String,
    required: true,
  },
  "Deployments First": {
    prop: "deployments_first",
    type: Date,
    required: true,
  },
  "Feedback Frequency": {
    prop: "feedback_frequency",
    type: String,
    required: false,
  },
  "Listening Models": {
    prop: "listening_models",
    type: (value) =>
      parseJson(
        value,
        "The format of 'Listening Models' column in 'General' workbook is wrong",
      ),
    required: false,
  },
  "Sustainable Development Goals": {
    prop: "sustainable_development_goals",
    type: (value) =>
      parseJson(
        value,
        "The format of 'Sustainable Development Goals' column in 'General' workbook is wrong",
      ),
  },
  "Direct Beneficiaries Map": {
    prop: "direct_beneficiaries_map",
    required: false,
    type: (value) =>
      parseJson(
        value,
        "The format of 'Direct Beneficiaries Map' column in 'General' workbook is wrong",
      ),
  },
  "Direct Beneficiaries Additional Map": {
    prop: "direct_beneficiaries_additional_map",
    required: false,
    type: (value) =>
      parseJson(
        value,
        "The format of 'Direct Beneficiaries Additional Map' column in 'General' workbook is wrong",
      ),
  },
};
