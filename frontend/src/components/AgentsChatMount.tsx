import { useEffect } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';
import { ChatSessionService } from '@/services/ChatSessionService';
import { ChatCopy, ChatLikeEmpty, ChatLikeFull } from "@/assets/svgs";
import { FavoritesService } from '@/services/FavoritesService';
import { useStore } from '@/store/useStore';

type Props = {
    webhookUrl: string;
    agentId?: string;
    containerId?: string;
    metadata?: Record<string, unknown>;
    sessionKey?: string;
    initialMessage?: string;
};

export default function AgentsChatMount(props: Readonly<Props>) {
    const { webhookUrl, agentId, containerId = 'n8n-chat-container', metadata = {}, sessionKey = null, initialMessage } = props;

    const { favorites, add, removeFav } = useStore() as any;

    // Check if a session already exists, else create a new one
    const customSessionId = sessionKey || crypto.randomUUID();

    useEffect(() => {
        // Error if webhook is invalid
        if (!webhookUrl) {
            console.error('Webhook URL is undefined');
            return;
        }

        // Creates div if it doesn't exist
        let el = document.getElementById(containerId);
        if (!el) {
            el = document.createElement('div');
            el.id = containerId;
            document.body.appendChild(el);
        }

        let chat;

        try {
            chat = createChat({
                webhookUrl,
                target: `#${containerId}`,
                mode: 'fullscreen',
                loadPreviousSession: true, // needed to load session
                enableStreaming: false,
                defaultLanguage: 'en',
                showWelcomeScreen: false,
                initialMessages: initialMessage ? [initialMessage] : [],
                chatInputKey: 'chatInput',
                metadata: {
                    ...metadata,
                    agentId,
                    customSessionId, // we send our custom session key
                },
                allowFileUploads: true,
                allowedFilesMimeTypes: 'image/jpeg,image/png,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
                chatSessionKey: 'sessionId',
            });

        } catch (error) {
            console.error('Error initializing chat:', error);
        }

        const chatContainer = document.getElementById(containerId);
        let observer: MutationObserver | null = null;

        // Only save new session if it doesn't already exists
        if (chatContainer) {

            // Saving session and updating store
            const saveSession = async (userFirstMessage) => {
                await ChatSessionService.post(customSessionId, agentId, userFirstMessage);
            }

            // Tells us if the first message has already been sent
            // so we know not to save the session again
            let firstMessageSent = false;
            let userFirstMessage = '';

            // Checks if textarea and button already exist so we can add event listeners
            observer = new MutationObserver(() => {
                const textarea = chatContainer.querySelector('textarea');
                const sendButton = chatContainer.querySelector('.chat-input-send-button');
                const chatList = chatContainer.querySelector('.chat-messages-list');

                if (!sessionKey) {
                    // Watches if user already typed in a first message and saves it partially so we
                    // can show it as a preview on the sidebars
                    if (textarea) {
                        textarea.addEventListener('input', (event: any) => {
                            const value = event.target.value.trim();
                            if (!firstMessageSent && value.length < 20) {
                                userFirstMessage = value + '...';
                            }
                        });

                        // Watches for user sending the message with an Enter
                        textarea.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                if (userFirstMessage.length > 0 && !firstMessageSent) {
                                    saveSession(userFirstMessage);
                                    firstMessageSent = true;
                                    observer?.disconnect();
                                }
                            }
                        })
                    }

                    // Watches for user sending the message by clicking Send button
                    if (sendButton) {
                        sendButton.addEventListener('click', (event: any) => {
                            if (event) {
                                if (userFirstMessage.length > 0 && !firstMessageSent) {
                                    saveSession(userFirstMessage);
                                    firstMessageSent = true;
                                    observer?.disconnect();
                                }
                            }
                        });
                    }
                }

                if (chatList) {

                    // We make sure loaded messages also have a toolbar
                    const chatMessages = chatList.querySelectorAll('.chat-message');
                    chatMessages.forEach((node) => {
                        addToolbar(node);
                    })

                    const chatObserver = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            mutation.addedNodes.forEach((node) => {
                                // @ts-expect-error: type error
                                if (node.nodeType === 1 && node.classList.contains('chat-message-from-bot') ||
                                    // @ts-expect-error: type error
                                    node.nodeType === 1 && node.classList.contains('chat-message-from-user')) {
                                    // @ts-expect-error: type error
                                    if (!node.classList.contains('chat-message-typing')) {
                                        addToolbar(node);
                                    }
                                }
                            });
                        }
                    });

                    chatObserver.observe(chatList, {
                        childList: true,   // Watch for added children
                        subtree: true      // Include all descendants
                    });
                }
            });
            observer.observe(chatContainer, { childList: true, subtree: true });
        }

        // Unmounts chat and disconnects observer once we no longer need them
        return () => {
            try {
                chat?.unmount?.();
                observer?.disconnect();
            } catch (err) {
                console.error(err);
            }
        };
    }, [webhookUrl, agentId, sessionKey, containerId, metadata, initialMessage]);

    function addToolbar(node) {
        const messageAuthor = node.classList.contains('chat-message-from-user') ? 'user' : 'bot';

        if ((node as HTMLElement).dataset?.favAugmented === 'true') return;

        const text = node.textContent?.trim() || '';
        if (text.length === 0) return;

        // Mark augmented
        (node as HTMLElement).dataset.favAugmented = 'true';

        // Generate a message id and store on element
        let messageId = 'msg-' + crypto.randomUUID();

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'chat-message-toolbar';
        if (messageAuthor === 'user') {
            toolbar.style.right = '0';
        } else {
            toolbar.style.left = '0';
        }

        const copyBtn = document.createElement('button');
        copyBtn.className = 'chat-message-copy-button';
        copyBtn.innerHTML = ChatCopy;

        copyBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            navigator.clipboard?.writeText(text).then(() => {
                copyBtn.className = 'chat-message-copy-button-copied';
                setTimeout(() => {
                    // Visual feedback
                    copyBtn.className = 'chat-message-copy-button';
                }, 1000);
            }).catch(() => { });
        });

        // Highlight if already favorited
        let isFavorited = false;
        try {
            const favMsg = favorites.find((f) => f.text === text && f.session === customSessionId);
            if (favMsg) {
                isFavorited = true;
                messageId = favMsg.message_id;
            }
        } catch (e) {
            // ignore
        }

        const heartBtn = document.createElement('button');
        heartBtn.className = 'chat-message-like-button';
        heartBtn.innerHTML = isFavorited ? ChatLikeFull : ChatLikeEmpty;

        heartBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const fav = async () => {
                try {
                    const res = await FavoritesService.post(
                        customSessionId,
                        agentId,
                        messageId,
                        text,
                    );
                    return res;
                } catch (err) {
                    console.error('Error favoriting message', err);
                    return false;
                }
            };

            const unfav = async () => {
                try {
                    const res = await FavoritesService.delete(messageId);
                    return res;
                } catch (err) {
                    console.error('Error unfavoriting message', err);
                    return false;
                }
            }

            // Either add or remove favorite
            if (isFavorited) {
                unfav();
                removeFav("favorites", messageId);
                heartBtn.innerHTML = ChatLikeEmpty;
                isFavorited = false;
            } else {
                fav();
                add("favorites", {
                    "session": customSessionId,
                    "agent": agentId,
                    "text": text,
                    "message_id": messageId
                });
                heartBtn.innerHTML = ChatLikeFull;
                isFavorited = true;
            }
        });

        toolbar.appendChild(copyBtn);
        toolbar.appendChild(heartBtn);

        // Append toolbar to node
        node.appendChild(toolbar);
    }

    return <div id={containerId} className="h-full w-full" />;
}

// simple hash code for generating deterministic-ish id from text
function hashCode(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // convert to 32bit integer
    }
    return hash;
}
