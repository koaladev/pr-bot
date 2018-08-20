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
const expect = require('chai').expect;
const CircleEnvModel = require('../../src/models/circle-env-model');

describe('circle-env-model', function() {
  it('is not circle', function() {
    delete process.env['CI'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isCircle).to.equal(false);
  });

  it('is circle', function() {
    process.env['CI'] = 'true';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isCircle).to.equal(true);
  });

  it('is not pull request', function() {
    delete process.env['CI_PULL_REQUEST'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isPullRequest).to.equal(false);
  });

  it('is not pull request either', function() {
    process.env['CI_PULL_REQUEST'] = 'push';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isPullRequest).to.equal(false);
  });

  it('is pull request', function() {
    process.env['CI_PULL_REQUEST'] = 'pull_request';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isPullRequest).to.equal(true);
  });

  it('no repo details', function() {
    delete process.env['CIRCLE_REPO_SLUG'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.repoDetails).to.equal(null);
  });

  it('no repo details either', function() {
    process.env['CIRCLE_REPO_SLUG'] = 'example';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.repoDetails).to.equal(null);
  });

  it('no repo details as well', function() {
    process.env['CIRCLE_REPO_SLUG'] = 'example/example-two/nope';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.repoDetails).to.equal(null);
  });

  it('get repo details', function() {
    process.env["CIRCLE_PROJECT_USERNAME"] = "example-owner";
    process.env["CIRCLE_PROJECT_REPONAME"] = "example-repo";

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.repoDetails).to.deep.equal({
      owner: 'example-owner',
      repo: 'example-repo',
    });
  });

  it('no PR sha', function() {
    delete process.env['CIRCLE_SHA1'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.pullRequestSha).to.equal(undefined);
  });

  it('get PR sha', function() {
    const injectedSha = '123456789abcde';
    process.env['CIRCLE_SHA1'] = injectedSha;

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.pullRequestSha).to.equal(injectedSha);
  });

  it('no PR number', function() {
    delete process.env['CIRCLE_PR_NUMBER'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.pullRequestNumber).to.equal(undefined);
  });

  it('get PR number', function() {
    const injectedPR = '123456';
    process.env['CIRCLE_PR_NUMBER'] = injectedPR;

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.pullRequestNumber).to.equal(injectedPR);
  });

  it('no test results', function() {
    delete process.env['CIRCLE_TEST_RESULT'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isSuccessfulCircleRun).to.equal(undefined);
  });

  it('bad test results', function() {
    process.env['CIRCLE_TEST_RESULT'] = '1';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isSuccessfulCircleRun).to.equal(false);
  });

  it('good test results', function() {
    process.env['CIRCLE_TEST_RESULT'] = '0';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.isSuccessfulCircleRun).to.equal(true);
  });

  it('should return undefined for no git branch', function() {
    delete process.env['CIRCLE_BRANCH'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.gitBranch).to.equal(undefined);
  });

  it('should return git branch', function() {
    const branch = 'my-random-branch';
    process.env['CIRCLE_BRANCH'] = branch;

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.gitBranch).to.equal(branch);
  });

  it('should return undefined for PR num', function() {
    delete process.env['CIRCLE_PR_NUMBER'];

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.pullRequestNumber).to.equal(undefined);
  });

  it('should return undefined for PR num === false', function() {
    process.env['CIRCLE_PR_NUMBER'] = 'false';

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.pullRequestNumber).to.equal(undefined);
  });

  it('should return the PR num', function() {
    const prNum = '123';
    process.env['CIRCLE_PR_NUMBER'] = prNum;

    const circleEnv = new CircleEnvModel();
    expect(circleEnv.pullRequestNumber).to.equal(prNum);
  });
});
