export function ColorModeScript() {
  const script = `(function(){try{var k='btf-color-mode';var m=localStorage.getItem(k);if(m==='light'||m==='dark')document.documentElement.dataset.colorMode=m;}catch(e){}})();`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
