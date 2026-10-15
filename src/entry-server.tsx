import { renderToString } from 'react-dom/server'
import App from './App'
import { initialContent, validContent, type Content } from './content'
export { initialContent, validContent }
export {legacyContent} from './content'
export { pageInfo, publicPaths, renderHead, replaceHead } from './lib/pages'
export function render(content: Content = initialContent, pathname = '/') { return renderToString(<App startingContent={content} startingPath={pathname} />) }

export {contentForPage} from './lib/content-scope'
export {readerContent,adoptApprovedWritings} from './lib/publication'
