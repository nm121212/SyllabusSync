#!/bin/bash

# Download Maven Wrapper JAR
echo "📥 Downloading Maven Wrapper..."

# Create .mvn/wrapper directory if it doesn't exist
mkdir -p .mvn/wrapper

# Download the Maven wrapper JAR
curl -o .mvn/wrapper/maven-wrapper.jar https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.1.0/maven-wrapper-3.1.0.jar

if [ $? -eq 0 ]; then
    echo "✅ Maven wrapper downloaded successfully"
    chmod +x mvnw
    echo "✅ Maven wrapper is ready to use"
else
    echo "❌ Failed to download Maven wrapper"
    exit 1
fi
