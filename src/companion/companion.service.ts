import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import appConfig from "src/app.config";
import { DeploymentMetadata } from "src/entities/deployment_metadata.entity";
import { Recipient } from "src/entities/recipient.entity";
import os from "node:os"
import fs from "node:fs"
import { exec } from "node:child_process";
import { zipDirectory } from "src/utilities";

@Injectable()
export class CompanionAppService {
  async verifyRecipientCode(code: string) {
    const recipient = await Recipient.findOne({
      where: { access_code: code },
      relations: { project: true },
    });

    if (recipient == null) {
      throw new NotFoundException("Recipient code is invalid");
    }

    return {
      recipient: recipient,
      program: recipient.project,
      deploymentPackage: await DeploymentMetadata.find({
        where: { project_id: recipient.project._id },
      }),
    };
  }

  async downloadSystemPrompts(id: string, language: string) {
    const metadata = await DeploymentMetadata.findOne({
      where: { id: id, published: true },
      relations: { project: true },
    });

    if (metadata == null) {
      throw new NotFoundException("Invalid deployment ID");
    }

    // Verify the language code is valid
    if (metadata.acm_metadata.system_prompts[language] == null) {
      throw new BadRequestException("Invalid language provided")
    }

    const promptsCache = `${os.tmpdir()}/system-prompts-${metadata.revision}-${language}.zip`
    if (fs.existsSync(promptsCache)) {
      return promptsCache
    }

    // No cache exists, download from s3
    const promptsDir = `${os.tmpdir()}/system-prompts-${metadata.revision}-${language}`
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir)
    }

    const key = `TB-Loaders/published/${metadata.revision}/system-prompts/${language}/`
    const cmd = `
    aws s3 sync \
      s3://${appConfig().buckets.content}/${metadata.project.code}/${key} ${promptsDir}
    `
    const { stdout, stderr } = await exec(cmd);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    await zipDirectory(promptsDir, promptsCache)

    return promptsCache
  }
}
