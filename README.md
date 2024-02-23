# Amplio Suite API

This project uses FastAPI and is deployed as a Lambda function using AWS ECR.

[![Checked with pyright](https://microsoft.github.io/pyright/img/pyright_badge.svg)](https://microsoft.github.io/pyright/)

## Prerequisites

To run this project, the following packages must be installed:

- Python 3.11 or higher
- [Pipenv](https://pipenv.pypa.io/en/latest/)
- Docker (optional)
- AWS CLI (optional)

## Local Development

1. Clone the repository:

    ```bash
    git clone https://github.com:LiteracyBridge/amplio-suite-api.git
    cd amplio-suite-api
    ```

2. Install the dependencies:

    ```bash
    pipenv install
    ```

3. Run the application:

    ```bash
    uvicorn app:app --reload # Access the server at http://localhost:8000
    ```

## Deployment

### AWS Lambda

The server can be deployed as a Docker image to AWS Lambda via AWS ECR. For step-by-step guide on how to deploy a Docker image to AWS Lambda, see [this guide](https://github.com/gbdevw/python-fastapi-aws-lambda-container/blob/main/documentation/deployment/awsconsole/aws_console.md).

To deploy the project, follow these steps.

> <strong>NOTE</strong>: Replace `<your-ecr-repo-url>` with your ECR repository URL, `region` with your AWS region and `a<ws-user-name>` with your AWS IAM username.

1. Build the Docker image:

    ```bash
    docker build --tag suite-api --file Dockerfile.aws.lambda .
    ```

2. Authenticate Docker to your Amazon ECR registry:

    ```bash
    aws ecr get-login-password --region <region> | docker login --username <aws-user-name> --password-stdin <your-ecr-repo-url>
    ```

3. Tag your image to match your repository string:

    ```bash
    docker tag suite-api:latest <your-ecr-repo-url>/suite-api:latest
    ```

4. Push this image to your newly created AWS repository:

    ```bash
    docker push <your-ecr-repo-url>/suite-api:latest
    ```

## Modules

1. [User Roles](docs/user-roles.md)
