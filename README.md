# Amplio Suite API

This project uses FastAPI and is deployed as a Lambda function using AWS ECR.

## Prerequisites

- Python 3.8 or higher
- [Pipenv](https://pipenv.pypa.io/en/latest/)
- Docker (optional)
- AWS CLI (optional)

## Local Development

1. Clone the repository:

    ```bash
    git clone https://github.com:LiteracyBridge/amplio-suite-api.git
    cd project
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

The project is deployed as a Docker image to AWS Lambda using AWS ECR. To deploy the project, follow these steps:

1. Build the Docker image:

    ```bash
    docker build --tag suite-api --file Dockerfile.aws.lambda .
    ```

2. Authenticate Docker to your Amazon ECR registry:

    ```bash
    aws ecr get-login-password --region region | docker login --username AWS --password-stdin your-ecr-repo-url
    ```

3. Tag your image to match your repository string:

    ```bash
    docker tag suite-api:latest your-ecr-repo-url/suite-api:latest
    ```

4. Push this image to your newly created AWS repository:

    ```bash
    docker push your-ecr-repo-url/suite-api:latest
    ```

## Modules

1. [User Roles](docs/user-roles.md)
