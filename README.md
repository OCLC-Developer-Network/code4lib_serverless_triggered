# Triggered Lambda

Custom application looks for new CSV files in an S3 bucket and uses the OCLC Number data within to look for present OCLC Number for each

## Installing Locally

### Step 1: Clone the repository
Clone this repository

```bash
$ git clone {url}
```
or download directly from GitHub.

Change into the application directory

### Step 2: Use npm
Download node and npm and use the `install` command to read the dependencies JSON file 

```bash
$ npm install
```

### Step 3: Configure application
1. Request a WSKey for WorldCat Metadata API - http://platform.worldcat.org/wskey/
- a Sandbox WSKey will work fine for this demo

2. Copy example_config.yml to prod_config.yml . Open prod_config.yml and edit to include:
- wskey
- secret
- principalID 
- principalIDNS
- institution

### Step 4: AWS Setup

1. Install AWS Commandline tools
- https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html
I reccomend using pip.
2. Create an AWS user in IAM console. Give it appropriate permissions. Copy the key and secret for this user to use in the CLI. 
3. Configure the commandline tools - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html

- Make sure you add 
-- key/secret
-- region

### Step 5: Encrypt your Credentials

1. Create a KMS key

2. Encrypt the config file

```bash
$ aws kms encrypt --key-id {key-id} --plaintext fileb://prod_config.yml --output text --query CiphertextBlob --output text | base64 -D > prod_config_encrypted.txt
```

### Step 6: Create an S3 Bucket for the files
1. Use the AWS Console to create a bucket. Note your bucket name!!!
2. Add a sample csv file of OCLC Numbers to the bucket.

### Step 7: Test application
1. Alter s3_event.json to point to your bucket and your sample csv file.

2. Use serverless to test locally

```bash
serverless invoke local --function checkOCLCNumber --path s3_event.json
```

##Installing in AWS Lambda

1. Download and setup the application, see Installing locally
2. Edit serverless.yml so it include your key ARN

```
service: 
    name: trigger-test
    awsKmsKeyArn: arn:aws:kms:us-east-1:XXXXXX:key/some-hash
```

3. Deploy the code using serverless

```bash
$ serverless deploy
```

4. Make sure the role for the Lambda has the right permissions
- KMS decrypt
- S3 read
5. Setup the trigger on the bucket
