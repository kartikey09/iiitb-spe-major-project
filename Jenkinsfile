pipeline {
    agent any

    environment {
        NAMESPACE = 'judge-system'
    }

    parameters {
        choice(name: 'ACTION', choices: ['Deploy', 'Cleanup'], description: 'Choose whether to deploy the application or clean up space')
    }

    stages {
        stage('1. Code Checkout') {
            steps {
                checkout scm
            }
        }

        stage('2. Verify Prerequisites') {
            steps {
                sh '''
                    echo "Checking system requirements..."
                    docker --version
                    minikube version
                    kubectl version --client
                    ansible --version
                '''
            }
        }

        stage('3. Provision & Deploy Infrastructure') {
            steps {
                script {
                    if (params.ACTION == 'Deploy') {
                        echo "Executing Ansible Deploy Playbook..."
                        sh 'ansible-playbook ansible/deploy.yml'
                    } else if (params.ACTION == 'Cleanup') {
                        echo "Executing Ansible Cleanup Playbook..."
                        sh 'ansible-playbook ansible/cleanup.yml'
                    }
                }
            }
        }
        
        stage('4. Verify Kubernetes Rollout') {
            when {
                expression { params.ACTION == 'Deploy' }
            }
            steps {
                sh '''
                    echo "Checking cluster status..."
                    kubectl get pods -n ${NAMESPACE}
                    kubectl get svc -n ${NAMESPACE}
                    kubectl get ingress -n ${NAMESPACE}
                '''
            }
        }

        stage('5. System Stress & Load Testing') {
            when {
                expression { params.ACTION == 'Deploy' }
            }
            steps {
                sh '''
                    echo "Installing Python requests library..."
                    pip3 install requests --break-system-packages || pip3 install requests
                    
                    echo "Setting up temporary port-forward for testing..."
                    kubectl port-forward svc/backend 8082:8082 -n ${NAMESPACE} > /dev/null 2>&1 &
                    PF_PID=$!
                    sleep 3
                    
                    echo "Running Stress Test Suite against the deployed infrastructure..."
                    set +e # Don't exit immediately on test failure
                    python3 stress_test.py http://localhost:8082/api
                    TEST_EXIT_CODE=$?
                    set -e
                    
                    echo "Cleaning up port-forward..."
                    kill $PF_PID
                    
                    exit $TEST_EXIT_CODE
                '''
            }
        }
    }
    
    post {
        always {
            echo "Pipeline finished executing action: ${params.ACTION}"
        }
        success {
            echo "Action ${params.ACTION} Succeeded!"
            mail to: 'admin@petcollege.edu',
                 subject: "✅ SUCCESS: Jenkins Pipeline '${env.JOB_NAME}' [${env.BUILD_NUMBER}]",
                 body: "The Jenkins CI/CD pipeline finished successfully.\n\nAction Executed: ${params.ACTION}\n\nView build details here: ${env.BUILD_URL}"
        }
        failure {
            echo "Action ${params.ACTION} Failed. Check logs for details."
            mail to: 'admin@petcollege.edu',
                 subject: "❌ FAILED: Jenkins Pipeline '${env.JOB_NAME}' [${env.BUILD_NUMBER}]",
                 body: "The Jenkins CI/CD pipeline encountered an error and FAILED.\n\nAction Executed: ${params.ACTION}\n\nPlease check the build logs to diagnose the issue: ${env.BUILD_URL}"
        }
    }
}
