import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from 'fs';
import * as path from 'path';

const REGION = process.env.AWS_REGION || 'eu-west-2';
const BUCKET_NAME = process.env.DISPATCH_ARTIFACT_BUCKET || '';

if (!BUCKET_NAME) {
  console.error('❌ DISPATCH_ARTIFACT_BUCKET environment variable required');
  process.exit(1);
}

const s3 = new S3Client({ region: REGION });

export async function uploadArtifact(artifactPath: string, projectName: string): Promise<string> {
    const filename = path.basename(artifactPath);
    const key = `projects/${projectName}/${Date.now()}_${filename}`;
    
    console.log(`Uploading artifact to s3://${BUCKET_NAME}/${key}...`);
    
    const fileStream = fs.createReadStream(artifactPath);
    
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileStream
    }));
    
    return key;
}
