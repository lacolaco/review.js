/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/update-notifier/update-notifier.d.ts" />
/// <reference path="../typings/commander/commander.d.ts" />
/// <reference path="../typings/js-yaml/js-yaml.d.ts" />

/// <reference path="./main.d.ts" />

import fs = require("fs");
import jsyaml = require("js-yaml");
import updateNotifier = require("update-notifier");
var pkg = require("../package.json");

var notifier = updateNotifier({
	packageName: pkg.name,
	packageVersion: pkg.version
});
if (notifier.update) {
	notifier.notify();
}

var packageJson = JSON.parse(fs.readFileSync(__dirname + "/../package.json", "utf8"));

var r:typeof ReVIEW = require("./api");
import program = require("commander");
(<any>program)
	.version(packageJson.version, "-v, --version")
	.option("--reviewfile <file>", "where is ReVIEWconfig.js?")
	.option("--base <path>", "alternative base path");

// <hoge> は required, [hoge] は optional
program
	.command("compile [document]")
	.description("compile ReVIEW document")
	.option("--ast", "output JSON format abstract syntax tree")
	.option("-t, --target <target>", "output format of document")
	.action((document:string, options:any)=> {
		var ast = !!options.ast;
		var target:string = options.target || "html";

		new Promise<{fileName:string; input:string;}>((resolve, reject)=> {
			var input = "";
			if (document) {
				var targetPath = process.cwd() + "/" + document;
				if (!fs.existsSync(targetPath)) {
					console.error(targetPath + " not exists");
					reject(null);
				}
				input = fs.readFileSync(targetPath, "utf8");
				resolve({fileName: document, input: input});
			} else {
				process.stdin.resume();
				process.stdin.setEncoding("utf8");
				process.stdin.on("data", (chunk:string) => {
					input += chunk;
				});
				process.stdin.on("end", () => {
					resolve({fileName: "content.re", input: input});
				});
			}
		})
			.then(value=> r.Exec.singleCompile(value.input, value.fileName, target, null))
			.then(result=> {
				if (!result.book.hasError && !ast) {
					result.book.allChunks[0].builderProcesses.forEach(process=> {
						console.log(process.result);
					});
					process.exit(0);
				} else if (!result.book.hasError) {
					var jsonString = JSON.stringify(result.book.allChunks[0].tree.ast, null, 2);
					console.log(jsonString);
					process.exit(0);
				} else {
					result.book.reports.forEach(report=> {
						var log:Function;
						switch (report.level) {
							case r.ReportLevel.Info:
								log = console.log;
							case r.ReportLevel.Warning:
								log = console.warn;
							case r.ReportLevel.Error:
								log = console.error;
						}
						var message = "";
						report.nodes.forEach(function (node) {
							message += "[" + node.line + "," + node.column + "] ";
						});
						message += report.message;
						log(message);
					});
					process.exit(1);
				}
			}, err=> {
				console.error("unexpected error", err);
				if (err.stack) {
					console.error(err.stack);
				}
				return Promise.reject(null);
			})
			.catch(()=> {
				process.exit(1);
			});
	});

program
	.command("build [target]")
	.description("build book")
	.action((target:string, options:any)=> {
		if (!target) {
			console.log("set target to html");
		}
		target = target || "html";
		var reviewfile = (<any>program).reviewfile || "./ReVIEWconfig.js";

		function byReVIEWConfig() {
			var setup = require(process.cwd() + "/" + reviewfile);
			r.start(setup, {
				reviewfile: reviewfile,
				base: (<any>program).base
			})
				.then(book=> {
					console.log("completed!");
					process.exit(0);
				})
				.catch(err=> {
					console.error("unexpected error", err);
					process.exit(1);
				});
		}

		function byConfigYaml() {
			// var configYaml = jsyaml.safeLoad(fs.readFileSync(process.cwd() + "/" + "config.yml", "utf8"));
			var catalogYaml = jsyaml.safeLoad(fs.readFileSync(process.cwd() + "/" + "catalog.yml", "utf8"));

			var configRaw:ReVIEW.IConfigRaw = {
				builders: [r.target2builder(target)],
				book: catalogYaml
			};

			r.start(review=> {
				review.initConfig(configRaw);
			}, {
				reviewfile: reviewfile,
				base: (<any>program).base
			})
				.then(book=> {
					console.log("completed!");
					process.exit(0);
				})
				.catch(err=> {
					console.error("unexpected error", err);
					process.exit(1);
				});
		}

		if (fs.existsSync(process.cwd() + "/" + reviewfile)) {
			byReVIEWConfig();
			return;
		} else if (fs.existsSync(process.cwd() + "/" + "config.yml")) {
			byConfigYaml();
			return;
		} else {
			console.log("can not found ReVIEWconfig.js or config.yml");
			process.exit(1);
		}
	});

program.parse(process.argv);