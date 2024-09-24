import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import readXlsxFile from 'read-excel-file/node';
import { Program } from 'src/entities/program.entity';
import { Project } from 'src/entities/project.entity';
import { User } from 'src/entities/user.entity';
import { FindOptionsWhere } from 'typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ProgramSpecService {
  constructor(private dataSource: DataSource) { }

  async findByCode(code: string, user?: User): Promise<Project> {
    const query: FindOptionsWhere<Project> = user == null ? { code: code } : {
      code: code, program: { users: { user_id: user.id } }
    }

    const found = await Project.findOne({
      where: query,
      relations: {
        general: true,
        recipients: true,
        deployments: { playlists: { messages: true } }
      }
    })

    if (found == null) {
      throw new NotFoundException("Program not found")
    }

    return found
  }

  async import(file: Express.Multer.File, code: string) {
    const { rows: [general] } = await readXlsxFile("/home/ephrim/Downloads/SSA-ETH-pub_progspec (V15) published version.xlsx", { schema: GENERAL_SCHEMA, sheet: 'General' });

    const { rows: deployments } = await readXlsxFile("/home/ephrim/Downloads/SSA-ETH-pub_progspec (V15) published version.xlsx", { schema: DEPLOYMENTS_SCHEMA, sheet: 'Deployments' });

    const { rows: contents } = await readXlsxFile("/home/ephrim/Downloads/SSA-ETH-pub_progspec (V15) published version.xlsx", { schema: CONTENT_SCHEMA, sheet: 'Content' });

    const { rows: recipients } = await readXlsxFile("/home/ephrim/Downloads/SSA-ETH-pub_progspec (V15) published version.xlsx", { schema: RECIPIENT_SCHEMA, sheet: 'Recipients' });

    const { rows: languages } = await readXlsxFile("/home/ephrim/Downloads/SSA-ETH-pub_progspec (V15) published version.xlsx", { schema: LANGUAGE_SCHEMA, sheet: 'Languages' });

    console.log(general)
    // console.log(general, deployments, contents, recipients, languages)

    // Save to db
    await this.dataSource.manager.transaction(async (manager) => {
      const program = await manager.findOne(Program, {
        where: { program_id: general.program_id as string }
      })

      if (program == null) {
        throw new NotFoundException(`Program '${general.program_id}' cannot not found`)
      }

      // general.
      // await manager.save(users)
      // await manager.save(photos)
      // ...
    });
  }
}

const errorMessageSuffix = "Please correct all errors and re-upload the sheet";
const parseJson = (value, error: string) => {
  try {
    return JSON.parse(value.trim())
  } catch (err) {
    throw new BadRequestException(`${error}. ${errorMessageSuffix}`)
  }
}

const LANGUAGE_SCHEMA = {
  "name": { prop: 'name', type: String, required: true },
  "code": { prop: 'code', type: String, required: true },
}

const RECIPIENT_SCHEMA = {
  "Country": { prop: 'country', type: String, required: true },
  "Region": { prop: 'region', type: String, required: true },
  "District": { prop: 'district', type: String, required: true },
  "Community": { prop: 'community', type: String, required: false },
  "Agent": { prop: 'agent', type: String, required: true },
  "Language Code": { prop: 'language_code', type: String, required: true },
  "Group Name": { prop: 'group_name', type: String, required: false },
  "Group Size": { prop: 'group_size', type: Number, required: false },
  "# HH": { prop: 'num_households', type: Number, required: false },
  "# TBs": { prop: 'num_tbs', type: Number, required: false },
  "Direct Beneficiaries": { prop: 'direct_beneficiaries', type: Number, required: false },
  "Indirect Beneficiaries": { prop: 'indirect_beneficiaries', type: Number, required: false },
  "Variant": { prop: 'variant', type: String, required: false },
  "Support Entity": { prop: 'support_entity', type: String, required: false },
  "Agent Gender": { prop: 'agent_gender', type: String, required: false },
  "Listening Model": { prop: 'listening_model', type: String, required: false },
  "Direct Beneficiaries Additional": {
    prop: 'direct_beneficiaries_additional',
    required: false,
    type: (value) => parseJson(value, "The format of 'Direct Beneficiaries Additional' column in 'Recipients' workbook is wrong")
  },
  "Affiliate": { prop: 'affiliate', type: String, required: false },
  "Partner": { prop: 'partner', type: String, required: false },
  "Components": { prop: 'components', type: String, required: false },
  "RecipientID": { prop: 'recipient_id', type: String, required: false },
  "Deployments": {
    prop: 'deployments',
    type: (value) => parseJson(value, "The format of 'Deployment' column in 'Recipient' workbook is wrong"),
    required: false
  },
}

const CONTENT_SCHEMA = {
  "Deployment #": { prop: 'number', type: Number, required: true },
  "Playlist Title": { prop: 'playlist_title', type: String, required: true },
  "Message Title": { prop: 'message_title', type: String, required: true },
  "Key Points": { prop: 'key_points', type: String, required: true },
  "Language Code": {
    required: true,
    prop: 'language_code',
    type: (value) => {
      try {
        return value.split(",").map((v) => v.trim())
      } catch (error) {
        throw new BadRequestException(`${error}. ${errorMessageSuffix}`)
      }
    },
  },
  "Variant": { prop: 'variant', type: String, required: true },
  "Format": { prop: 'format', type: String, required: true },
  "Audience": { prop: 'audience', type: String, required: true },
  "Default Category": { prop: 'default_category', type: String, required: true },
  "SDG Goals": { prop: 'sdg_goals', type: Number, required: true },
  "SDG Targets": { prop: 'sdg_targets', type: String, required: true },
}

const DEPLOYMENTS_SCHEMA = {
  "Deployment #": { prop: 'number', type: Number, required: true },
  "Start Date": { prop: 'start_date', type: Date, required: true },
  "End Date": { prop: 'end_date', type: Date, required: true },
  "Deployment Name": { prop: 'name', type: String, required: true },
}

const GENERAL_SCHEMA = {
  "Program ID": { prop: 'program_id', type: String, required: true },
  "Country": { prop: 'country', type: String, required: true },
  "Affiliate": { prop: 'affiliate', type: String, required: false },
  "Partner": { prop: 'partner', type: String, required: false },
  "Regions": {
    prop: 'regions',
    type: (value) => parseJson(value, "The format of 'Regions' column in 'General' workbook is wrong"),
    required: true
  },
  "Languages": {
    prop: 'languages',
    type: (value) => parseJson(value, "The format of 'Languages' column in 'General' workbook is wrong"),
    required: true
  },
  "Deployments Count": { prop: 'deployments_count', type: Number, required: true },
  "Deployments Length": { prop: 'deployments_length', type: String, required: true },
  "Deployments First": { prop: 'deployments_first', type: Date, required: true },
  "Feedback Frequency": { prop: 'feedback_frequency', type: String, required: false },
  "Listening Models": {
    prop: 'listening_models',
    type: (value) => parseJson(value, "The format of 'Listening Models' column in 'General' workbook is wrong")
  },
  "Sustainable Development Goals": {
    prop: 'sustainable_development_goals',
    type: (value) => parseJson(value, "The format of 'Sustainable Development Goals' column in 'General' workbook is wrong")
  },
  "Direct Beneficiaries Map": {
    prop: 'direct_beneficiaries_map',
    required: false,
    type: (value) => parseJson(value, "The format of 'Direct Beneficiaries Map' column in 'General' workbook is wrong")
  },
  "Direct Beneficiaries Additional Map": {
    prop: 'direct_beneficiaries_additional_map',
    required: false,
    type: (value) => parseJson(value, "The format of 'Direct Beneficiaries Additional Map' column in 'General' workbook is wrong")
  }
}
