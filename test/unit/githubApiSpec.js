"use strict"
describe("githubApi", function() {
  beforeEach(module("githubApi", function(){}));

  //test a function against a function definition (defined below)
  function testAgainstFunctionDefinition(functionName, funDef) {
    describe("has a function \""+functionName+"\" which", function() {
      it("returns a promise", inject(function(githubApi) {
        var returnValue = githubApi[functionName]();
        expect(typeof returnValue.then).toBe("function");
        expect(typeof returnValue.catch).toBe("function");
        expect(typeof returnValue.finally).toBe("function");
      }));
      it("expects at least " + funDef.minParams + " parameters", inject(function(githubApi, $rootScope) {
        var errCallback = jasmine.createSpy("error");
        debugger;
        for(var params = []; params.length < funDef.minParams; params.push("test")) {
          var promise = githubApi[functionName].apply(githubApi, params);
          promise.then(null, errCallback);
          $rootScope.$digest();
          expect(errCallback).toHaveBeenCalled();
          errCallback.calls.reset();
        }
      }));
      function runTestRun(testRun) {
        it("handles the parameters " + JSON.stringify(testRun.params) + " correctly", inject(function(githubApi, $rootScope, $httpBackend) {
          $httpBackend.expectGET(testRun.expectedQuery).respond({answer: "stub"});
          var promise = githubApi[functionName].apply(githubApi, testRun.params);
          $rootScope.$digest();
        }));
      }
      for(var i = 0; i < funDef.testRuns.length; i++) {
        var testRun = funDef.testRuns[i];
        runTestRun(testRun);
      }
    });
  }
  //the function definitions
  var functionDefinitions = {
    searchUser: {
      minParams: 1,
      testRuns: [
        {params: ["userxyz"], expectedQuery: "https://api.github.com/search/users?q=userxyz"},
        {params: ["abc", {sort:"name", order:"asc", page: 2}], expectedQuery: "https://api.github.com/search/users?q=abc&page=2&sort=name&order=asc"}
      ]
    },
    listUserRepositories: {
      minParams: 1,
      testRuns: [
        {params: ["a-user"], expectedQuery: "https://api.github.com/users/a-user/repos"},
        {params: ["a-user", {type: "owner"}], expectedQuery: "https://api.github.com/users/a-user/repos?type=owner"}
      ]
    },
    getRepository: {
      minParams: 2,
      testRuns: [
        {params: ["username", "awesome-repo"], expectedQuery: "https://api.github.com/repos/username/awesome-repo"}
      ]
    },
    listBranches: {
      minParams: 2,
      testRuns: [
        {params: ["username", "awesome-repo"], expectedQuery: "https://api.github.com/repos/username/awesome-repo/branches"}
      ]
    },
    getBranch: {
      minParams: 3,
      testRuns: [
        {params: ["username", "awesome-repo", "gh-pages"], expectedQuery: "https://api.github.com/repos/username/awesome-repo/branches/gh-pages"}
      ]
    },
    listTags: {
      minParams: 2,
      testRuns: [
        {params: ["username", "awesome-repo"], expectedQuery: "https://api.github.com/repos/username/awesome-repo/tags"}
      ]
    },
    listCommits: {
      minParams: 2,
      testRuns: [
        {params: ["vogelsgesang", "awesome-repo"], expectedQuery: "https://api.github.com/repos/vogelsgesang/awesome-repo/commits"},
        {params: ["vogelsgesang", "awesome-repo", {sha: "testSHA"}], expectedQuery: "https://api.github.com/repos/vogelsgesang/awesome-repo/commits?sha=testSHA"}
      ]
    },
    getTree: {
      minParams: 3,
      testRuns: [
        {
          params: ["vogelsgesang", "awesome-repo", "cd312"],
          expectedQuery: "https://api.github.com/repos/vogelsgesang/awesome-repo/git/trees/cd312"
        },
        {
          params: ["vogelsgesang", "awesome-repo", "cd312", {"recursive": 1}],
          expectedQuery: "https://api.github.com/repos/vogelsgesang/awesome-repo/git/trees/cd312?recursive=1"
        }
      ]
    },
    getCompleteTree: {
      minParams: 3,
      testRuns: [
        {
          params: ["vogelsgesang", "awesome-repo", "cd312"],
          expectedQuery: "https://api.github.com/repos/vogelsgesang/awesome-repo/git/trees/cd312?recursive=1"
        }
      ]
    }
  };
  //test if all function definitions are fulfilled
  for(var i = 0; i < Object.keys(functionDefinitions).length; i++) {
    var funName = Object.keys(functionDefinitions)[i];
    testAgainstFunctionDefinition(funName, functionDefinitions[funName]);
  }
  //TODO: in addition, test the return format of getCompleteTree
});
