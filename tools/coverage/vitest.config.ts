// `npm run test:coverage` (tools/coverage/report.mjs): the normal test configuration plus the coverage recorder.
import { mergeConfig } from 'vite';
import base from '../../vite.config';

export default mergeConfig(base, { test: { setupFiles: ['tools/coverage/setup.ts'] } });
