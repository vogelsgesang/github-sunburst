"use strict";
/**
 * This file contains the "githubApi" module which provides
 * the "githubApi" service.
 */
(function() {
  angular.module("githubApi", ["uri-templates"])
  .service("githubApi", GithubApi);

  // taken from https://gist.github.com/deiu/9335803
  // parse a Link header
  //
  // Link:<https://example.org/.meta>; rel=meta
  //
  // var r = parseLinkHeader(xhr.getResponseHeader('Link');
  // r['meta']['href'] outputs https://example.org/.meta
  function parseLinkHeader(header) {
    // unquote string (utility)
    function unquote(value) {
      if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
      return value;
    }
    var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
    var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

    var matches = header.match(linkexp);
    var rels = new Object();
    for (var i = 0; i < matches.length; i++) {
      var split = matches[i].split('>');
      var href = split[0].substring(1);
      var ps = split[1];
      var link = new Object();
      link.href = href;
      var s = ps.match(paramexp);
      for (var j = 0; j < s.length; j++) {
        var p = s[j];
        var paramsplit = p.split('=');
        var name = paramsplit[0];
        link[name] = unquote(paramsplit[1]);
      }
      if (link.rel != undefined) {
        rels[link.rel] = link;
      }
    }
    return rels;
  }

  function GithubApi($http, $q, uriTemplate) {
    //the http headers to sent with every request
    var headers = {
      "Accept": "application/vnd.github.v3+json",
    }
    //the url templates
    var urls = {
      userSearch: "https://api.github.com/search/users?q={query}{&page,per_page,sort,order}",
      listUserRepositories: "https://api.github.com/users/{user}/repos{?type,page,per_page,sort}",
      repository: "https://api.github.com/repos/{owner}/{repo}",
      listBranches: "https://api.github.com/repos/{owner}/{repo}/branches{?page,per_page}",
      branch: "https://api.github.com/repos/{owner}/{repo}/branches/{branch}",
      listTags: "https://api.github.com/repos/{owner}/{repo}/tags{?page,per_page}",
      listCommits: "https://api.github.com/repos/{owner}/{repo}/commits{?sha,path,author,since,until,page,per_page}",
      tree: "https://api.github.com/repos/{owner}/{repo}/git/trees/{sha}{?recursive}"
    }
    //this function send a GET request with the necessary headers and returns the promise
    //after applying decoratePromiseForPagination to it
    function sendGetQuery(url) {
      return decoratePromiseForPagination($http.get(url, {headers:headers}))
        .then(function(res) {
          return res.data;
        });
    }
    //decorates the result with functions for using the pagination mechanism of Github
    function decoratePromiseForPagination(p) {
      return p.then(function(res) {
        res.pagination = {};
        var linkHeader = res.headers().link;
        if(linkHeader) {
          var links = parseLinkHeader(linkHeader);
          if(links.next) {
            res.pagination.next = function() {return sendGetQuery(links.next.href);}
          }
          if(links.prev) {
            res.pagination.prev = function() {return sendGetQuery(links.prev.href);}
          }
        }
        return res;
      });
    }
    //creates a function which in turns queries the github API
    //queryType is used as index into the urls object in order to retrieve the url template
    //namedParams is an array containing the names of the parameters expected by the returned function
    //(well, just read the code...)
    function createQueryFunction(queryType, namedParams) {
      var paramCnt = namedParams.length;
      return function() {
        if(arguments.length < paramCnt) {
          return $q.reject(new Error(
            "tried to query " + queryType + " with insufficient arguments. Expected arguments: " + namedParams.join(",")
          ));
        }
        var params = arguments[paramCnt];
        if(params === undefined) params = {};
        for(var i = 0; i < namedParams.length; i++) {
          params[namedParams[i]] = arguments[i];
        }
        return sendGetQuery(uriTemplate(urls[queryType]).fillFromObject(params));
      }
    }
    //create the actual functions used to query the API
    this.searchUser = createQueryFunction("userSearch", ["query"]);
    this.listUserRepositories = createQueryFunction("listUserRepositories", ["user"]);
    this.getRepository = createQueryFunction("repository", ["owner", "repo"]);
    this.listBranches = createQueryFunction("listBranches", ["owner", "repo"]);
    this.getBranch = createQueryFunction("branch", ["owner", "repo", "branch"]);
    this.listTags = createQueryFunction("listTags", ["owner", "repo"]);
    this.listCommits = createQueryFunction("listCommits", ["owner", "repo"]);
    this.getTree = createQueryFunction("tree", ["owner", "repo", "sha"]);
    //returns a complete tree as a nice tree structure
    this.getCompleteTree = function(owner, repo, sha, params) {
      if(arguments.length < 3) {
        return $q.reject(new Error(
          "tried to call getCompleteTree with insufficient arguments."
        ));
      }
      if(params === undefined) params = {};
      params.recursive = 1;
      return this.getTree(owner, repo, sha, params)
        .then(function(response) {
          return extractTree(response.tree);
        });
    } //getCompleteTree
    //extracts a nice tree structure from the github response
    function extractTree(ghTree) {
      //extracts a subtree from a set of children
      function extractSubtree(children, subtreePath) {
        //the own tree has an empty path
        var ownTree = _.find(children, {path: ""});
        if(ownTree) {
          _.pull(children, ownTree);
        } else {
          ownTree = {};
        }
        //group by the directory of files
        //the "tree" objects are grouped into the corresponding directory
        //(this is the reason for this ternary expression)
        var subtrees = _.groupBy(children, function(child) {
          var i = child.path.indexOf("/");
          return i < 0 && child.type=="tree" ? child.path : child.path.substr(0, i);
        });
        //handle the direct children
        var directChildren = subtrees[""] !== undefined ? subtrees[""] : [];
        _.forEach(directChildren, function(child) {
          child.name = child.path;
          child.path = subtreePath.concat(child.name);
        });
        delete subtrees[""];
        //now, handle the subfolders
        subtrees = _.map(subtrees, function(subtree, pathFragment) {
          //build the subpath
          var subPath = subtreePath.concat([pathFragment])
          //remove the pathFragment form the path of all children
          _.forEach(subtree, function(c) {
            c.path = c.path.substr(pathFragment.length+1);
          });
          //extract the subTree
          return extractSubtree(subtree, subPath);
        });
        //finally, return this level of the tree
        return _.assign(ownTree, {
          path: subtreePath,
          name: subtreePath[subtreePath.length-1],
          children: subtrees.concat(directChildren)
        });
      };
      return extractSubtree(ghTree, []);
    }//extractTree
  };
})();
