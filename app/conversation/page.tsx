import { ConversationalTranslation } from '../../components/ConversationalTranslation';

export default function ConversationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <ConversationalTranslation />
      </div>
    </main>
  );
}