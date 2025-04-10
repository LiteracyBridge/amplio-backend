import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import appConfig from "src/app.config";
import { DeploymentMetadata } from "src/entities/deployment_metadata.entity";
import { Recipient } from "src/entities/recipient.entity";
import os from "node:os"
import fs from "node:fs"
import { exec, execSync } from "node:child_process";
import { zipDirectory } from "src/utilities";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

  async downloadPrompts(id: string, language: string) {
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

    const promptsCache = `${os.tmpdir()}/prompts-${metadata.revision}-${language}.zip`
    if (fs.existsSync(promptsCache)) {
      return promptsCache
    }

    // No cache exists, download from s3
    const promptsDir = `${os.tmpdir()}/prompts-${metadata.revision}-${language}`
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir)
    }

    // Download system prompts
    const key = `${this.getRevisionPath(metadata)}/system-prompts/${language}/`
    const output1 = await execSync(`
    aws s3 sync \
      s3://${appConfig().buckets.content}/${key} ${promptsDir}
    `);
    console.log('stdout:', output1);

    // Download playlist prompts
    const key2 = `${this.getRevisionPath(metadata)}/contents/${language}/playlist-prompts/`
    const cmd = `
    aws s3 sync \
      s3://${appConfig().buckets.content}/${key2} ${promptsDir}
    `
    const output = await execSync(cmd);
    console.log('stdout:', output);

    await zipDirectory(promptsDir, promptsCache)

    return promptsCache
  }

  async downloadContent(opts: { id: string, language: string, contentId: string }) {
    const { id, language, contentId } = opts;

    const metadata = await DeploymentMetadata.findOne({
      where: { id: id, published: true },
      relations: { project: true },
    });

    if (metadata == null) {
      throw new NotFoundException("Invalid deployment id");
    }

    // Verify the language code is valid
    const contents = metadata.acm_metadata.contents[language]
    if (contents == null) {
      throw new BadRequestException("Invalid language provided")
    }

    const msg = contents.messages.find(m => m.acm_id == contentId)
    if (msg == null) {
      throw new NotFoundException("Message cannot be found")
    }

    // Generates a presigned url
    const key = `${this.getRevisionPath(metadata)}/${msg.path}`
    const cmd = `
      aws s3 presign s3://${appConfig().buckets.content}/${key} --expires-in 604800
    `
    const output = await execSync(cmd);
    console.log(output.toString())

    return output.toString()
  }

  private getRevisionPath(metadata: DeploymentMetadata) {
    return `${metadata.project.code}/TB-Loaders/published/${metadata.revision}`
  }
}
