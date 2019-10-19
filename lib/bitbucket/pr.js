/*global requirejs,console,define,fs*/
// Dan Shumaker
// Documentation: https://developer.atlassian.com/bitbucket/api/2/reference/
define([
  'superagent',
  'cli-table',
  'moment',
  '../../lib/config'
], function (request, Table, moment, config) {

  var pullrequest = {
    query: null,
    table: null,

    list: function (options) {
      fields = 'fields=values.reviewers.username,values.id,values.title,values.state,values.destination.branch.name,values.source.branch.name,values.author.username';
      this.query = 'pull-requests?';
      if (options.merged) {
        this.query = this.query + 'q=state+%3D+%22MERGED%22';
      } else {
        this.query = this.query + 'q=state+%3D+%22OPEN%22';
      }
      if (options.destination) {
        this.query = this.query + '+AND+destination.branch.name+%3D+%22' + options.destination + '%22';
      }

      this.query = this.query + '&' + fields + '&pagelen=50';
      if (options.verbose) {
        console.log(config.auth.url + this.query);
      }
      var that = this, i = 0;
      //  .set('Authorization', 'Basic ' + config.auth.password)
      //  .auth(config.auth.user,config.auth.password)
      request
        .get(config.auth.url + this.query)
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Basic ' + config.auth.password)
        .then(res => {
          if (options.verbose) {
            console.log(config);
            console.log(res);
          }
          if (!res) {
            return console.log("results => " + res);
          }

          that.pull_requests = res.body.values;
          that.table = new Table({
            head: ['ID', 'Author', 'Source', 'Destination', 'Title','State', 'Reviewers']
            , chars: {
              'top': ''
              , 'top-mid': ''
              , 'top-left': ''
              , 'top-right': ''
              , 'bottom': ''
              , 'bottom-mid': ''
              , 'bottom-left': ''
              , 'bottom-right': ''
              , 'left': ''
              , 'left-mid': ''
              , 'mid': ''
              , 'mid-mid': ''
              , 'right': ''
              , 'right-mid': ''
            }
            , style: {
              'padding-left': 1
              , 'padding-right': 1
              , head: ['cyan']
              , compact : true
            }
          });

          for (i = 0; i < that.pull_requests.length; i += 1) {
            title = that.pull_requests[i].title;
            //console.log(that.pull_requests[i]);
            reviewers = that.pull_requests[i].reviewers.map(function(elem){ return elem.username; }).join(",");
            //reviewers = that.pull_requests[i];
            //reviewers = "N/A";

            if (title.length > 70) {
              title = title.substr(0, 67) + '...';
            }
            that.table.push([
              that.pull_requests[i].id,
              that.pull_requests[i].author.username,
              that.pull_requests[i].source.branch.name,
              that.pull_requests[i].destination.branch.name,
              title,
              that.pull_requests[i].state,
              reviewers
            ]);
          }

          if (that.pull_requests.length > 0) {
            console.log(that.table.toString());
          } else {
            console.log('No pull_requests');
          }
        });

    },

    //MERGE POST https://api.bitbucket.org/2.0/repositories/dan_shumaker/backup_tar_test/pullrequests/3/merge
    merge: function (options) {
      console.log("merge");
    },

    create: function (options) {
      this.query = 'pull-requests';
      var that = this;
      console.log("Create Pull Request");
      json_package = {
        "destination": { "branch": { "name": options.to } } ,
        "source": { "branch": { "name" : options.source }},
        "title": options.create,
        "description": options.description,
        "state": "OPEN",
        "open": true,
        "closed": false,
        "fromRef": {
          "id": "refs/heads/" + options.source,
          "repository": {
            "slug":  config.slug,
            "name": "",
            "project": {
              "key": config.project_key
            }
          }
        },
        "toRef": {
          "id": "refs/heads/" + options.to,
          "repository": {
            "slug":  config.slug,
            "name": "",
            "project": {
              "key": config.project_key
            }
          }
        },
        "reviewers": config.reviewers } ;
      if (options.verbose) {
        console.log(config.auth.url + this.query);
        console.log(json_package);
      }
      request
        .post(config.auth.url + this.query)
        .send( json_package )
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Basic ' + config.auth.password)
        .then(res => {
          if (!res.ok) {
            if (options.verbose) {
              console.log(res);
            }
            console.log(this.query);
            console.log(JSON.stringify(json_package));
            return console.log(JSON.stringify(res.body));
          }
          console.log("Created PR @ " + res.body.links.self.href);
        });
    },
    decline: function (options) {
      this.query = 'pullrequests/' + options.decline + '/decline' ;
      console.log(this.query);
      console.log("Declining PR " + options.decline);
      request
        .post(config.auth.url + this.query)
        .set('Authorization', 'Basic ' + config.auth.password)
        .then(res => {
          if (!res.ok) {
            if (options.verbose) {
              console.log(res);
            }
            return console.log((res.body.errorMessages || [res.error]).join('\n'));
          }
          console.log("Declined PR " + options.decline);
        });
    },

  };
  return pullrequest;

});

