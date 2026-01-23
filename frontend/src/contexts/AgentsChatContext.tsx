import React, { createContext, useContext, useState } from 'react';

interface AgentsChatContextType {
  isModalOpen: boolean;
  selectedAgentId: string | null;
  sessionKey: string | null;
  scrollSearch: string | null;
  openModal: (agentId?: string, sessionKey?: string, searchRes?: string) => void;
  isReset: boolean;
  setResetHomepage: (status?: boolean) => void;
  resetHomepage: () => void;
  closeModal: () => void;
  // open a session and scroll to a specific message id
  openSessionAndScroll: (sessionKey: string, messageId?: string) => void;
  // target message id to scroll to when a session is opened
  targetMessageId: string | null;
  setTargetMessageId: (id: string | null) => void;
}

const AgentsChatContext = createContext<AgentsChatContextType | undefined>(undefined);

export const useAgentsChat = () => {
  const context = useContext(AgentsChatContext);
  if (!context) {
    throw new Error('useAgentsChat must be used within an AgentsChatProvider');
  }
  return context;
};

interface AgentsChatProviderProps {
  children: React.ReactNode;
}

export const AgentsChatProvider: React.FC<AgentsChatProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [isReset, setResetHomepage] = useState(false);
  const [scrollSearch, setScrollSearch] = useState<string | null>(null);
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  const openSessionAndScroll = (sessionKeyParam: string, messageId?: string) => {
    setTargetMessageId(messageId || null);
    openModal(undefined, sessionKeyParam);
  };

  const openModal = (agentId?: string, sessionKeyParam?: string, searchRes?: string) => {
    setSelectedAgentId(agentId || null);
    setSessionKey(sessionKeyParam || null);
    setScrollSearch(searchRes || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAgentId(null);
    setSessionKey(null);
  };

  const resetHomepage = () => {
    setIsModalOpen(false);
    setSelectedAgentId(null);
    setSessionKey(null);
    setResetHomepage(true);
  }

  return (
    <AgentsChatContext.Provider value={{
      isModalOpen,
      selectedAgentId,
      sessionKey,
      isReset,
      scrollSearch,
      setResetHomepage,
      resetHomepage,
      openModal,
      closeModal,
      openSessionAndScroll,
      targetMessageId,
      setTargetMessageId,
    }}>
      {children}
    </AgentsChatContext.Provider>
  );
};
