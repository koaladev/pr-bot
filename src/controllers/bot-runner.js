/**
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const fs = require("fs-extra");
const path = require("path");
const execSync = require("child_process").execSync;
const logHelper = require("../utils/log-helper");
// const TravisEnvModel = require('../models/travis-env-model');
const CircleEnvModel = require("../models/circle-env-model");
const GithubController = require("./github-controller");

const TMPDIR_PREFIX = `/tmp/pr-bot/`;

class CircleBot {
  constructor({ configPath } = {}) {
    logHelper.setPrimaryPrefix("PR-Bot 🤖");

    if (!configPath) {
      configPath = path.resolve("pr-bot.config.js");
    }
    this._configPath = configPath;
  }

  run() {
    const circleEnv = new CircleEnvModel();

    return this._readConfig().then(configuration => {
      let repoDetails = circleEnv.repoDetails;
      if (!repoDetails) {
        repoDetails = configuration.repoDetails;
      }
      if (!repoDetails) {
        throw new Error(
          `Unable to get the Github 'repoDetails' from Circle ` +
            `environment variable or the configuration file.`
        );
      }

      const githubController = new GithubController({
        owner: repoDetails.owner,
        repo: repoDetails.repo
      });

      return this._buildBeforeAndAfter(
        configuration,
        circleEnv,
        githubController
      )
        .then(({ beforePath, afterPath }) => {
          return this._runPlugins(configuration.plugins, {
            beforePath,
            afterPath
          });
        })
        .then(pluginResults => {
          if (!circleEnv.isCircle || !circleEnv.isPullRequest) {
            this._logDebugInfo(pluginResults);
            return Promise.resolve();
          }

          return this._logGithubState(
            configuration,
            circleEnv,
            githubController,
            pluginResults
          );
        });
    });
  }

  _readConfig() {
    return fs
      .access(this._configPath)
      .catch(err => {
        throw new Error(
          `Unable to find the config file: '${this._configPath}'.`
        );
      })
      .then(() => {
        try {
          return require(this._configPath);
        } catch (err) {
          throw new Error(`A problem occurred running the config file.`);
        }
      });
  }

  _buildBeforeAndAfter(configuration, circleEnv, githubController) {
    fs.ensureDir(TMPDIR_PREFIX);

    return githubController
      .getRepoDetails()
      .then(repoDetails => {
        const cloneUrl = repoDetails.data.clone_url;
        const beforePath = fs.mkdtempSync(TMPDIR_PREFIX);

        logHelper.log(`Cloning default branch into: '${beforePath}'.`);
        execSync(`git clone ${cloneUrl} ${beforePath}`);

        if (configuration.overrideBaseBranch) {
          execSync(`git checkout ${configuration.overrideBaseBranch}`, {
            cwd: beforePath
          });
        }

        if (!circleEnv.pullRequestSha) {
          logHelper.warn(
            `No 'CIRCLE_PULL_REQUEST_SHA' environment variable, ` +
              `so using the current directory for further testing.`
          );
          return {
            beforePath,
            afterPath: "."
          };
        }

        const afterPath = fs.mkdtempSync(TMPDIR_PREFIX);

        logHelper.log(`Cloning default branch into: '${afterPath}'.`);
        execSync(`git clone ${cloneUrl} ${afterPath}`);
        execSync(`git checkout ${circleEnv.pullRequestSha}`, {
          cwd: afterPath
        });

        return {
          beforePath,
          afterPath
        };
      })
      .then(({ beforePath, afterPath }) => {
        let buildCommand = `npm install && npm run build`;
        if (configuration.buildCommand) {
          buildCommand = configuration.buildCommand;
        }

        logHelper.log(
          `Building before and after versions with: '${buildCommand}'.`
        );

        try {
          execSync(buildCommand, {
            cwd: beforePath
          });
        } catch (err) {
          logHelper.error(
            `Unable to run '${buildCommand}' in the "before" version.`
          );
        }

        try {
          execSync(buildCommand, {
            cwd: afterPath
          });
        } catch (err) {
          logHelper.error(
            `Unable to run '${buildCommand}' in the "after" version.`
          );
          throw err;
        }

        return { beforePath, afterPath };
      });
  }

  _runPlugins(plugins, details) {
    const pluginResults = {};
    return plugins
      .reduce((promiseChain, plugin) => {
        logHelper.log(`Running Plugins....`);
        return promiseChain.then(() => {
          if (!plugin.name) {
            throw new Error(
              `One of the plugins has failed to define a name ` +
                `property. This is required for reporting.`
            );
          }

          logHelper.log(`  ${plugin.name}`);

          return plugin
            .run(details)
            .catch(err => {
              throw new Error(
                `The '${plugin.name}' threw an error while ` +
                  `running: '${err.message}'`
              );
            })
            .then(result => {
              pluginResults[plugin.name] = result;
            });
        });
      }, Promise.resolve())
      .then(() => {
        logHelper.log(``);
        return pluginResults;
      });
  }

  _logDebugInfo(pluginResults) {
    logHelper.log(`Results from plugins`);

    const pluginNames = Object.keys(pluginResults);
    pluginNames.forEach(pluginName => {
      const result = pluginResults[pluginName];
      logHelper.log(`  ${pluginName}`);
      if (result.prettyLog) {
        console.log("");
        console.log(result.prettyLog);
        console.log("");
      } else {
        logHelper.log("    This plugin provided no log output.");
      }
    });
  }

  _logGithubState(configuration, circleEnv, githubController, pluginResults) {
    let githubComment = ``;
    let failPR = false;
    const pluginNames = Object.keys(pluginResults);
    pluginNames.forEach(pluginName => {
      const result = pluginResults[pluginName];
      githubComment += `### ${pluginName}\n\n`;
      if (result.markdownLog) {
        githubComment += result.markdownLog;
      } else {
        githubComment += `This plugin provided no markdown output.`;
      }
      githubComment += `\n\n`;

      if (result.failPR) {
        failPR = true;
      }
    });

    let deletePromise = Promise.resolve();
    if (configuration.botUsername) {
      deletePromise = githubController.deletePreviousIssueComments({
        number: circleEnv.pullRequestNumber,
        botName: configuration.botUsername
      });
    }

    return deletePromise
      .then(() => {
        return githubController.postIssueComment({
          number: circleEnv.pullRequestNumber,
          comment: githubComment
        });
      })
      .then(() => {
        return githubController.postState({
          sha: circleEnv.pullRequestSha,
          state: failPR ? "failure" : "success"
        });
      });
  }
}

module.exports = CircleBot;
