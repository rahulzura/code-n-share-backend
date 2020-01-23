const fs = require("fs");

const inComment = substr => {
  // returns true if the end of the substring is inside a comment, false otherwise
  let commentStartPos = substr.indexOf("<!--");
  let commentEndPos;
  if (commentStartPos !== -1) {
    // inside a comment
    commentEndPos = substr.indexOf("-->");
    if (commentEndPos !== -1) {
      // comment has ended
      // check if the substring from the end of the comment contains other comments
      return inComment(substr.slice(commentEndPos));
    } else {
      // comment has not ended, meaning the end of the substring is inside a comment
      // hence return true
      return true;
    }
  } else {
    // no comments in the substring
    // hence return false
    return false;
  }
};

const validTagPos = (str, tag, startPos = 0) => {
  // returns pos of tag in str if exists, null otherwise
  let tagPos = str.indexOf(tag);
  let tagPosSubstr;
  let commentEndPos;
  if (tagPos !== -1) {
    tagPosSubstr = str.slice(startPos, tagPos); // got a substring for the loop
  } else {
    // couldn't find tag
    console.log(tag + " not found");
    return null;
  }

  while (inComment(tagPosSubstr)) {
    // this html tag is in a comment
    // get out of this comment and find next occurance of tag
    commentEndPos = tagPosSubstr.indexOf("-->");
    if (commentEndPos === -1) {
      // if comment did not end, that means no valid occurance of tag
      console.log(tag + " not found");
      return null; // out of the loop
    } else {
      // get the next tagPos starting from
      // commentEndTagPos + 3 (length of -->)
      tagPos = str.indexof(tag, commentEndPos + 3);
      if (tagPos !== -1) {
        tagPosSubstr = str.slice(commentEndPos + 6, tagPos); // got a substring for the loop
      } else {
        // couldn't find tag
        console.log(tag + " not found");
        return null; // out of the loop
      }
    }
  }
};

const cssInsertPos = htmlInput => {
  const htmlTagPos = validTagPos(htmlInput, "<html>");
  if (htmlTagPos !== null) {
    const headTagPos = validTagPos(htmlInput, "<head>", htmlTagPos + 6);
    if (headTagPos !== null) {
      return headTagPos + 6;
    } else {
      console.log("No <head> tag found!");
      return null;
    }
  } else {
    console.log("No <html> tag found!");
    return null;
  }
};

const deleteFiles = (db, age) => {
  db = JSON.parse(db);

  db = db.filter(page => {
    // if expired
    if (Date.now() - page.date >= age) {
      fs.unlinkSync("pages/" + page.name); // delete the file
      fs.appendFileSync(
        "log.txt",
        "Deleted " + page.name + " at " + new Date() + "\n"
      );
      return false;
    }
    // for all not expired, add it to the db
    return true;
  });

  const dbJson = JSON.stringify(db);
  fs.writeFileSync("logs/db.json", dbJson);
  return dbJson;
};

module.exports = {
  cssInsertPos: cssInsertPos,
  deleteFiles: deleteFiles
};
