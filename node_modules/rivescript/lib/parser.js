"use strict";
var Parser, RS_VERSION, utils;

utils = require("./utils");

RS_VERSION = "2.0";

Parser = (function() {
  function Parser(master) {
    this.master = master;
    this.strict = master._strict;
    this.utf8 = master._utf8;
  }

  Parser.prototype.say = function(message) {
    return this.master.say(message);
  };

  Parser.prototype.warn = function(message, filename, lineno) {
    return this.master.warn(message, filename, lineno);
  };

  Parser.prototype.parse = function(filename, code, onError) {
    var ast, cmd, comment, concatModes, curTrig, field, fields, halves, i, inobj, isThat, j, k, l, lang, lastcmd, left, len, len1, len2, len3, len4, li, line, lineno, lines, localOptions, lookCmd, lookahead, lp, m, mode, n, name, objBuf, objLang, objName, parts, ref, syntaxError, temp, topic, type, val, value;
    ast = {
      begin: {
        global: {},
        "var": {},
        sub: {},
        person: {},
        array: {}
      },
      topics: {},
      objects: []
    };
    topic = "random";
    lineno = 0;
    comment = false;
    inobj = false;
    objName = "";
    objLang = "";
    objBuf = [];
    curTrig = null;
    lastcmd = "";
    isThat = null;
    localOptions = {
      concat: "none"
    };
    concatModes = {
      none: "",
      newline: "\n",
      space: " "
    };
    lines = code.split("\n");
    for (lp = j = 0, len = lines.length; j < len; lp = ++j) {
      line = lines[lp];
      lineno = lp + 1;
      line = utils.strip(line);
      if (line.length === 0) {
        continue;
      }
      if (inobj) {
        if (line.indexOf("< object") > -1 || line.indexOf("<object") > -1) {
          if (objName.length > 0) {
            ast.objects.push({
              name: objName,
              language: objLang,
              code: objBuf
            });
          }
          objName = objLang = "";
          objBuf = [];
          inobj = false;
        } else {
          objBuf.push(line);
        }
        continue;
      }
      if (line.indexOf("//") === 0) {
        continue;
      } else if (line.indexOf("#") === 0) {
        this.warn("Using the # symbol for comments is deprecated", filename, lineno);
        continue;
      } else if (line.indexOf("/*") === 0) {
        if (line.indexOf("*/") > -1) {
          continue;
        }
        comment = true;
        continue;
      } else if (line.indexOf("*/") > -1) {
        comment = false;
        continue;
      }
      if (comment) {
        continue;
      }
      if (line.length < 2) {
        this.warn("Weird single-character line '" + line + "' found.", filename, lineno);
        continue;
      }
      cmd = line.substring(0, 1);
      line = utils.strip(line.substring(1));
      if (line.indexOf(" // ") > -1) {
        line = utils.strip(line.split(" // ")[0]);
      }
      syntaxError = this.checkSyntax(cmd, line);
      if (syntaxError !== "") {
        if (this.strict && typeof onError === "function") {
          onError.call(null, "Syntax error: " + syntaxError + " at " + filename + " line " + lineno + " near " + cmd + " " + line);
        } else {
          this.warn("Syntax error: " + syntaxError + " at " + filename + " line " + lineno + " near " + cmd + " " + line);
        }
      }
      if (cmd === "+") {
        isThat = null;
      }
      this.say("Cmd: " + cmd + "; line: " + line);
      ref = lines.slice(lp + 1);
      for (li = k = 0, len1 = ref.length; k < len1; li = ++k) {
        lookahead = ref[li];
        lookahead = utils.strip(lookahead);
        if (lookahead.length < 2) {
          continue;
        }
        lookCmd = lookahead.substring(0, 1);
        lookahead = utils.strip(lookahead.substring(1));
        if (lookCmd !== "%" && lookCmd !== "^") {
          break;
        }
        if (lookahead.length === 0) {
          break;
        }
        this.say("\tLookahead " + li + ": " + lookCmd + " " + lookahead);
        if (cmd === "+") {
          if (lookCmd === "%") {
            isThat = lookahead;
            break;
          } else {
            isThat = null;
          }
        }
        if (cmd === "!") {
          if (lookCmd === "^") {
            line += "<crlf>" + lookahead;
          }
          continue;
        }
        if (cmd !== "^" && lookCmd !== "%") {
          if (lookCmd === "^") {
            if (concatModes[localOptions.concat] !== void 0) {
              line += concatModes[localOptions.concat] + lookahead;
            } else {
              line += lookahead;
            }
          } else {
            break;
          }
        }
      }
      switch (cmd) {
        case "!":
          halves = line.split("=", 2);
          left = utils.strip(halves[0]).split(" ");
          value = type = name = "";
          if (halves.length === 2) {
            value = utils.strip(halves[1]);
          }
          if (left.length >= 1) {
            type = utils.strip(left[0]);
            if (left.length >= 2) {
              left.shift();
              name = utils.strip(left.join(" "));
            }
          }
          if (type !== "array") {
            value = value.replace(/<crlf>/g, "");
          }
          if (type === "version") {
            if (parseFloat(value) > parseFloat(RS_VERSION)) {
              this.warn("Unsupported RiveScript version. We only support " + RS_VERSION, filename, lineno);
              return false;
            }
            continue;
          }
          if (name.length === 0) {
            this.warn("Undefined variable name", filename, lineno);
            continue;
          }
          if (value.length === 0) {
            this.warn("Undefined variable value", filename, lineno);
            continue;
          }
          switch (type) {
            case "local":
              this.say("\tSet local parser option " + name + " = " + value);
              localOptions[name] = value;
              break;
            case "global":
              this.say("\tSet global " + name + " = " + value);
              ast.begin.global[name] = value;
              break;
            case "var":
              this.say("\tSet bot variable " + name + " = " + value);
              ast.begin["var"][name] = value;
              break;
            case "array":
              this.say("\tSet array " + name + " = " + value);
              if (value === "<undef>") {
                ast.begin.array[name] = "<undef>";
                continue;
              }
              parts = value.split("<crlf>");
              fields = [];
              for (l = 0, len2 = parts.length; l < len2; l++) {
                val = parts[l];
                if (val.indexOf("|") > -1) {
                  fields.push.apply(fields, val.split("|"));
                } else {
                  fields.push.apply(fields, val.split(" "));
                }
              }
              for (i = m = 0, len3 = fields.length; m < len3; i = ++m) {
                field = fields[i];
                fields[i] = fields[i].replace(/\\s/ig, " ");
              }
              ast.begin.array[name] = fields;
              break;
            case "sub":
              this.say("\tSet substitution " + name + " = " + value);
              ast.begin.sub[name] = value;
              break;
            case "person":
              this.say("\tSet person substitution " + name + " = " + value);
              ast.begin.person[name] = value;
              break;
            default:
              this.warn("Unknown definition type " + type, filename, lineno);
          }
          break;
        case ">":
          temp = utils.strip(line).split(" ");
          type = temp.shift();
          name = "";
          fields = [];
          if (temp.length > 0) {
            name = temp.shift();
          }
          if (temp.length > 0) {
            fields = temp;
          }
          switch (type) {
            case "begin":
            case "topic":
              if (type === "begin") {
                this.say("Found the BEGIN block.");
                type = "topic";
                name = "__begin__";
              }
              this.say("Set topic to " + name);
              curTrig = null;
              topic = name;
              this.initTopic(ast.topics, topic);
              mode = "";
              if (fields.length >= 2) {
                for (n = 0, len4 = fields.length; n < len4; n++) {
                  field = fields[n];
                  if (field === "includes" || field === "inherits") {
                    mode = field;
                  } else if (mode !== "") {
                    ast.topics[topic][mode][field] = 1;
                  }
                }
              }
              break;
            case "object":
              lang = "";
              if (fields.length > 0) {
                lang = fields[0].toLowerCase();
              }
              if (lang === "") {
                this.warn("Trying to parse unknown programming language", filename, lineno);
                lang = "javascript";
              }
              objName = name;
              objLang = lang;
              objBuf = [];
              inobj = true;
              break;
            default:
              this.warn("Unknown label type " + type, filename, lineno);
          }
          break;
        case "<":
          type = line;
          if (type === "begin" || type === "topic") {
            this.say("\tEnd the topic label.");
            topic = "random";
          } else if (type === "object") {
            this.say("\tEnd the object label.");
            inobj = false;
          }
          break;
        case "+":
          this.say("\tTrigger pattern: " + line);
          this.initTopic(ast.topics, topic);
          curTrig = {
            trigger: line,
            reply: [],
            condition: [],
            redirect: null,
            previous: isThat
          };
          ast.topics[topic].triggers.push(curTrig);
          break;
        case "-":
          if (curTrig === null) {
            this.warn("Response found before trigger", filename, lineno);
            continue;
          }
          this.say("\tResponse: " + line);
          curTrig.reply.push(line);
          break;
        case "*":
          if (curTrig === null) {
            this.warn("Condition found before trigger", filename, lineno);
            continue;
          }
          this.say("\tCondition: " + line);
          curTrig.condition.push(line);
          break;
        case "%":
          continue;
        case "^":
          continue;
        case "@":
          this.say("\tRedirect response to: " + line);
          curTrig.redirect = utils.strip(line);
          break;
        default:
          this.warn("Unknown command '" + cmd + "'", filename, lineno);
      }
    }
    return ast;
  };

  Parser.prototype.checkSyntax = function(cmd, line) {
    var angle, char, chars, curly, j, len, parens, parts, square;
    if (cmd === "!") {
      if (!line.match(/^.+(?:\s+.+|)\s*=\s*.+?$/)) {
        return "Invalid format for !Definition line: must be '! type name = value' OR '! type = value'";
      }
    } else if (cmd === ">") {
      parts = line.split(/\s+/);
      if (parts[0] === "begin" && parts.length > 1) {
        return "The 'begin' label takes no additional arguments";
      } else if (parts[0] === "topic") {
        if (line.match(/[^a-z0-9_\-\s]/)) {
          return "Topics should be lowercased and contain only letters and numbers";
        }
      } else if (parts[0] === "object") {
        if (line.match(/[^A-Za-z0-9\_\-\s]/)) {
          return "Objects can only contain numbers and letters";
        }
      }
    } else if (cmd === "+" || cmd === "%" || cmd === "@") {
      parens = square = curly = angle = 0;
      if (this.utf8) {
        if (line.match(/[A-Z\\.]/)) {
          return "Triggers can't contain uppercase letters, backslashes or dots in UTF-8 mode";
        }
      } else if (line.match(/[^a-z0-9(|)\[\]*_#@{}<>=\s]/)) {
        return "Triggers may only contain lowercase letters, numbers, and these symbols: ( | ) [ ] * _ # { } < > =";
      }
      chars = line.split("");
      for (j = 0, len = chars.length; j < len; j++) {
        char = chars[j];
        switch (char) {
          case "(":
            parens++;
            break;
          case ")":
            parens--;
            break;
          case "[":
            square++;
            break;
          case "]":
            square--;
            break;
          case "{":
            curly++;
            break;
          case "}":
            curly--;
            break;
          case "<":
            angle++;
            break;
          case ">":
            angle--;
        }
      }
      if (parens !== 0) {
        return "Unmatched parenthesis brackets";
      }
      if (square !== 0) {
        return "Unmatched square brackets";
      }
      if (curly !== 0) {
        return "Unmatched curly brackets";
      }
      if (angle !== 0) {
        return "Unmatched angle brackets";
      }
    } else if (cmd === "*") {
      if (!line.match(/^.+?\s*(?:==|eq|!=|ne|<>|<|<=|>|>=)\s*.+?=>.+?$/)) {
        return "Invalid format for !Condition: should be like '* value symbol value => response'";
      }
    }
    return "";
  };

  Parser.prototype.initTopic = function(topics, name) {
    if (topics[name] == null) {
      return topics[name] = {
        includes: {},
        inherits: {},
        triggers: []
      };
    }
  };

  return Parser;

})();

module.exports = Parser;
