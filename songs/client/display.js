Template.songDisplay.helpers({
    content: function () {
        var contents = [];
        for (var _id in this.arrangement.order) {
            var section = songsections.findOne(this.arrangement.order[_id]);
            for (var c in section.contents) {
                var content = section.contents[c];
                content.section = section._id;
                content.index = c;
                contents.push(content);
            }
        }
        return contents;
    },
    
    getText: function () {
        return this.text.replace(/(\r\n|\n|\r)/gm, '<br>');
    }
});