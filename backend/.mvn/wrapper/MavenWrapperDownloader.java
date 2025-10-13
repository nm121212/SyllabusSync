/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.maven.wrapper;

import java.io.BufferedInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Properties;

/**
 * Downloader for the Maven wrapper.
 */
public class MavenWrapperDownloader {

    private static final String WRAPPER_VERSION = "3.1.0";
    private static final String DEFAULT_DOWNLOAD_URL = "https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/" + WRAPPER_VERSION + "/maven-wrapper-" + WRAPPER_VERSION + ".jar";

    public static void main(String[] args) {
        if (args.length != 1) {
            System.err.println("Usage: MavenWrapperDownloader <mavenProjectBaseDir>");
            System.exit(1);
        }

        String mavenProjectBaseDir = args[0];
        Path mavenProjectBaseDirPath = Paths.get(mavenProjectBaseDir);
        Path wrapperJarPath = mavenProjectBaseDirPath.resolve(".mvn/wrapper/maven-wrapper.jar");

        if (Files.exists(wrapperJarPath)) {
            System.out.println("Maven wrapper jar already exists, skipping download.");
            return;
        }

        String downloadUrl = getDownloadUrl();
        System.out.println("Downloading Maven wrapper from: " + downloadUrl);

        try {
            URL url = URI.create(downloadUrl).toURL();
            try (InputStream in = new BufferedInputStream(url.openStream())) {
                Files.createDirectories(wrapperJarPath.getParent());
                Files.copy(in, wrapperJarPath, StandardCopyOption.REPLACE_EXISTING);
            }
            System.out.println("Maven wrapper jar downloaded successfully.");
        } catch (IOException e) {
            System.err.println("Failed to download Maven wrapper jar: " + e.getMessage());
            System.exit(1);
        }
    }

    private static String getDownloadUrl() {
        String downloadUrl = System.getenv("MVNW_REPOURL");
        if (downloadUrl == null) {
            downloadUrl = DEFAULT_DOWNLOAD_URL;
        }
        return downloadUrl;
    }
}
