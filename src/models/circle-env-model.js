class CircleEnvModel {
  get isCircle() {
    return process.env["CI"] === "true";
  }

  get isPullRequest() {
    return process.env["CI_PULL_REQUEST"];
  }

  get repoDetails() {
    if (!process.env["CIRCLE_PROJECT_REPONAME"]) {
      return null;
    }

    if (!process.env["CIRCLE_PROJECT_USERNAME"]) {
      return null;
    }

    return {
      owner: process.env["CIRCLE_PROJECT_USERNAME"],
      repo: process.env["CIRCLE_PROJECT_REPONAME"]
    };
  }

  // The target branch of the pull request OR the current
  // branch that is commited to.
  get gitBranch() {
    return process.env["CIRCLE_BRANCH"];
  }

  get pullRequestSha() {
    return process.env["CIRCLE_SHA1"];
  }

  // get pullRequestNumber() {
  //   if (
  //     !process.env["CIRCLE_PR_NUMBER"] ||
  //     process.env["CIRCLE_PR_NUMBER"] === "false"
  //   ) {
  //     return undefined;
  //   }
  //
  //   return process.env["CIRCLE_PR_NUMBER"];
  // }

  get pullRequestNumber() {
    if (process.env["CIRCLE_PULL_REQUEST"]) {
      const prUrl = process.env["CIRCLE_PULL_REQUEST"];
      const splitted = prUrl.split('pull/');
      if (splitted[1] !== undefined) {
        return splitted[1];
      }
    }
    return false;
  }

  get isSuccessfulCircleRun() {
    // actually this doesnt exist in circleci
    // ...opportunity to manually set it after builds runs ok.
    const testResult = process.env["CIRCLE_TEST_RESULT"];
    if (typeof testResult === "undefined") {
      return undefined;
    }

    return testResult === "0";
  }
}

module.exports = CircleEnvModel;
