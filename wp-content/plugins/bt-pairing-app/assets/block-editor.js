(function (blocks, element, blockEditor) {
  var el = element.createElement;
  var useBlockProps = blockEditor.useBlockProps;

  blocks.registerBlockType('bt/pairing-app', {
    apiVersion: 2,
    title: 'BT Pairing App',
    icon: 'beer',
    category: 'widgets',
    edit: function () {
      var props = useBlockProps();
      return el('div', props, 'BT Pairing App');
    },
    save: function () {
      return null;
    },
  });
})(window.wp.blocks, window.wp.element, window.wp.blockEditor || window.wp.editor);
