/*global requirejs,define,fs*/
define([
    'commander',
    'fs',
    './config'
], function (program, fs, config) {

    var Auth = {
        cfgPath: config.cfgPath || null,
        fullPath: config.cfgFilePath || null,
        answers: {},

        checkConfig: function () {
            if (fs.existsSync(this.fullPath)) {
                console.log(this.fullPath);
                configObject = JSON.parse(fs.readFileSync(this.fullPath, 'utf-8'));

                config.auth = configObject.auth;
                config.reviewers = configObject.reviewers;
                config.slug = configObject.slug;
                config.project_key = configObject.project_key;

                if (!config.reviewers) {
                    console.log('Ops! Seems like your ' + this.fullPath + ' is out of date. Please reset you configuration.');
                    return false;
                } else {
                    return true;
                }

            } else {
                return false;
            }
        },

        ask: function (question, callback, password) {
            var that = this;

            if (password) {
                program.password(question, function (answer) {
                    if (answer.length > 0) {
                        callback(answer);
                    } else {
                        that.ask(question, callback, true);
                    }
                });
            } else {
                program.prompt(question, function (answer) {
                    if (answer.length > 0) {
                        callback(answer);
                    } else {
                        that.ask(question, callback);
                    }
                });
            }
        },

        setConfig: function (callback) {
            var that = this;

            if (this.checkConfig()) {
                return callback(true);
            } else {
                that.ask("What is your slug? as defined here http://example.com/rest/api/1.0/projects/{**projectKey}/repos/{repositorySlug}/**pull-requests ", function (answer) {
                    that.answers.slug = answer;
                    that.ask("What is your project key? as defined here http://example.com/rest/api/1.0/projects/{**projectKey}/repos/{repositorySlug}/**pull-requests ", function (answer) {
                        that.answers.project_key = answer;

                        that.ask('What is the repository base url that comes between http:// and rest/api/1.0/projects/ as in http://example.com/rest/api/1.0/projects/{**projectKey}/repos/{repositorySlug}/**pull-requests\nYOU WILL NEED TO HIT ENTER TWICE', function (answer) {
                            that.answers.url = 'http://' + answer + '/rest/api/1.0/projects/' + that.answers.project_key + '/repos/' +  that.answers.slug + '/';
                            that.ask('Username: ', function (answer) {
                                that.answers.user = answer;

                                that.ask('Password: ', function (answer) {
                                    that.answers.pass = answer;

                                    that.ask('Reviewers comma separated list (do not include yourself) sample string: ezeedub,dan_shumaker,scodx,bonfil1', function (answer) {
                                        that.answers.reviewers = [];
                                        answer.split(',').forEach(user => that.answers.reviewers.push({"user": {"name": user}}));
                                        process.stdin.destroy();
                                        that.saveConfig();
                                        if (callback) {
                                            return callback(true);
                                        }
                                    });
                                }, true);
                            });
                        });
                    });
                });
            }
        },

        clearConfig: function () {
            var that = this;

            if (!fs.existsSync(this.fullPath)) {
                console.log('There is no stored data. Skipping.');
            } else {
                program.confirm('Are you sure? ', function (answer) {
                    if (answer) {
                        fs.unlinkSync(that.fullPath);
                        console.log('Configuration deleted successfully!');
                    }
                    process.stdin.destroy();
                });
            }
        },

        saveConfig: function () {
            var configFile = {}, auth;

            if (this.answers.url) {
                if (!/\/$/.test(this.answers.url)) {
                    this.answers.url += '/';
                }
            }

            if (this.answers.user && this.answers.pass) {
                this.answers.password = this.answers.user + ':' + this.answers.pass;

                auth = {
                    url: this.answers.url,
                    user: this.answers.user,
                    password: Buffer.from(this.answers.password).toString('base64')
                };

                delete this.answers.pass;
            }

            configFile = {
                auth: auth,
                reviewers: this.answers.reviewers,
                slug: this.answers.slug,
                project_key: this.answers.project_key
            };

            fs.writeFileSync(this.fullPath, JSON.stringify(configFile, null, 2));
            console.log('Information stored!');
        }
    };

    return Auth;

});
