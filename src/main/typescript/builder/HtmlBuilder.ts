///<reference path='../Utils.ts' />
///<reference path='../Builder.ts' />
///<reference path='../i18n.ts' />

module ReVIEW {
    export module Build {

    import i18n = ReVIEW.i18n;

    import SyntaxTree = ReVIEW.Parse.SyntaxTree;
    import NodeSyntaxTree = ReVIEW.Parse.NodeSyntaxTree;
    import BlockElementSyntaxTree = ReVIEW.Parse.BlockElementSyntaxTree;
    import InlineElementSyntaxTree = ReVIEW.Parse.InlineElementSyntaxTree;
    import HeadlineSyntaxTree = ReVIEW.Parse.HeadlineSyntaxTree;
    import TextNodeSyntaxTree = ReVIEW.Parse.TextNodeSyntaxTree;
    import ChapterSyntaxTree = ReVIEW.Parse.ChapterSyntaxTree;

    import nodeToString = ReVIEW.nodeToString;
    import findChapter = ReVIEW.findChapter;

        export class HtmlBuilder extends DefaultBuilder {

            chapterPost(process:Process, node:ChapterSyntaxTree):any {
                process.out("<br/>");
            }

            headlinePre(process:Process, name:string, node:HeadlineSyntaxTree) {
                process.out("<h").out(node.level).out(">");
                if (node.level === 1) {
                    var text = i18n.t("builder.chapter", node.parentNode.no);
                    process.out(text).out("　");
                } else if (node.level === 2) {
                    process.out(node.parentNode.toChapter().fqn).out("　");
                }
            }

            headlinePost(process:Process, name:string, node:HeadlineSyntaxTree) {
                process.out("</h").out(node.level).out(">");
            }

            block_list_pre(process:Process, node:BlockElementSyntaxTree) {
                //TODO styleは外出す
                //TODO エスケープ処理
                process.out("<div style='margin:20px;'>");
                var chapter = findChapter(node, 1);
                var text = i18n.t("builder.list", chapter.fqn, node.no);
                process.out(text).out("　").out(node.args[1].arg).out("\n");
                process.out(text).out("<pre style='padding:20px; border:1px solid #ccc;background-color: #eee;'>");
                return (v) => {
                    // name, args はパスしたい
                    node.childNodes.forEach((node)=> {
                        ReVIEW.visit(node, v);
                    });
                };
                process.out(text).out("</pre>");
            }

            block_list_post(process:Process, node:BlockElementSyntaxTree) {
                process.out("</div>");
            }

            inline_list(process:Process, node:InlineElementSyntaxTree) {
                var chapter = findChapter(node, 1);
                var listNode = this.findReference(process, node).referenceTo.referenceNode.toBlockElement();
                var text = i18n.t("builder.list", chapter.fqn, listNode.no);
                process.out(text);
                return false;
            }

            inline_hd_pre(process:Process, node:InlineElementSyntaxTree) {
                process.out("「");
                var chapter = findChapter(node);
                if (chapter.level === 1) {
                    process.out(chapter.fqn).out("章 ");
                } else {
                    process.out(chapter.fqn).out(" ");
                }
                process.out(nodeToString(chapter.headline));
                return false;
            }

            inline_hd_post(process:Process, node:InlineElementSyntaxTree) {
                process.out("」");
            }
        }
    }
}