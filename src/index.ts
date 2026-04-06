import app from './app';
import { processService } from './modules/process/process.service';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  await processService.cleanupOrphans();

  app.listen(PORT, () => {
    console.log(`LAO backend running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);

export default app;
