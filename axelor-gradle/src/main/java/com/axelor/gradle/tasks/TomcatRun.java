/*
 * Axelor Business Solutions
 *
 * Copyright (C) 2005-2022 Axelor (<http://axelor.com>).
 *
 * This program is free software: you can redistribute it and/or  modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package com.axelor.gradle.tasks;

import com.axelor.common.FileUtils;
import com.axelor.gradle.support.TomcatSupport;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.jar.Attributes;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;
import java.util.stream.Collectors;
import org.gradle.api.GradleException;
import org.gradle.api.Project;
import org.gradle.api.file.FileCollection;
import org.gradle.api.plugins.JavaPluginConvention;
import org.gradle.api.tasks.JavaExec;
import org.gradle.api.tasks.SourceSet;
import org.gradle.api.tasks.TaskAction;
import org.gradle.api.tasks.options.Option;

public class TomcatRun extends JavaExec {

  private static final String MAIN_CLASS = "com.axelor.app.internal.AppRunner";

  private int port = 8080;

  public TomcatRun() {
    setMain(MAIN_CLASS);
  }

  @Option(option = "port", description = "Specify the tomcat server port.")
  public void setPort(String port) {
    this.port = Integer.parseInt(port);
  }

  public static List<String> getArgs(Project project, int port) {
    final File baseDir = FileUtils.getFile(project.getBuildDir(), "tomcat");
    final File confFile = FileUtils.getFile(baseDir, TomcatSupport.TOMCAT_RUNNER_CONFIG);

    final List<String> args = new ArrayList<>();

    args.add("--port");
    args.add("" + port);
    args.add("--config");
    args.add(TomcatSupport.toRelativePath(project, confFile));

    return args;
  }

  public static List<String> getJvmArgs(Project project, boolean debug) {
    final List<String> jvmArgs = new ArrayList<>();
    if (debug) {
      jvmArgs.add("-Daxelor.view.watch=true");
    }
    return jvmArgs;
  }

  private static File createManifestJar(Project project) {
    final File baseDir = FileUtils.getFile(project.getBuildDir(), "tomcat");
    final File jarFile = FileUtils.getFile(baseDir, "classpath.jar");
    final FileCollection classpath =
        project
            .getConvention()
            .getPlugin(JavaPluginConvention.class)
            .getSourceSets()
            .getByName(SourceSet.MAIN_SOURCE_SET_NAME)
            .getRuntimeClasspath();

    final Manifest manifest = new Manifest();
    final Attributes attributes = manifest.getMainAttributes();

    attributes.put(Attributes.Name.MANIFEST_VERSION, "1.0");
    attributes.put(Attributes.Name.MAIN_CLASS, MAIN_CLASS);
    attributes.put(
        Attributes.Name.CLASS_PATH,
        classpath.getFiles().stream()
            .map(File::toURI)
            .map(Object::toString)
            .collect(Collectors.joining(" ")));

    try (JarOutputStream jos = new JarOutputStream(new FileOutputStream(jarFile), manifest)) {
      return jarFile;
    } catch (IOException e) {
      throw new GradleException("Unexpected error occured.", e);
    }
  }

  @TaskAction
  @Override
  public void exec() {
    final Project project = getProject();

    classpath(createManifestJar(project));

    setArgs(getArgs(project, port));
    setJvmArgs(getJvmArgs(project, getDebug()));

    super.exec();
  }
}
