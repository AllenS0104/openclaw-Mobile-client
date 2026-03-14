import { Redirect, useLocalSearchParams } from 'expo-router';
import { useChatStore } from '../../src/store/chatStore';
import { useEffect } from 'react';

export default function ChatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setActiveConversation } = useChatStore();

  useEffect(() => {
    if (id) {
      setActiveConversation(id);
    }
  }, [id]);

  // Redirect to main chat tab which will show the active conversation
  return <Redirect href="/" />;
}
