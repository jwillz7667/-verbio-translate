import { TranscriptionTranslation } from '../../components/TranscriptionTranslation';

export default function TranscribePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <TranscriptionTranslation />
      </div>
    </main>
  );
}