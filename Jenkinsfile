pipeline {
    agent any

    environment {
        NAMESPACE = 'judge-system'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Prerequisites') {
            steps {
                sh '''
                    echo "Checking system requirements..."
                    docker --version
                    minikube version
                    kubectl version --client
                '''
            }
        }

        stage('Build & Deploy to Minikube') {
            steps {
                // The deploy.sh script handles Minikube startup, Docker environment setup, 
                // building the container images, and applying K8s YAMLs.
                sh '''
                    chmod +x deploy.sh
                    ./deploy.sh
                '''
            }
        }
        
        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "Checking cluster status..."
                    kubectl get pods -n ${NAMESPACE}
                    kubectl get svc -n ${NAMESPACE}
                    kubectl get ingress -n ${NAMESPACE}
                '''
            }
        }
    }
    
    post {
        always {
            echo 'Deployment Pipeline finished'
        }
        success {
            echo 'Deployment Succeeded! Services are running in minikube.'
        }
        failure {
            echo 'Deployment Failed. Check logs for details.'
        }
    }
}
