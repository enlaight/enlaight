import { create } from 'zustand';

// Use Case:
// import { useStore } from '@/store/useStore';
// const { agents: storeAgents, update } = useStore();
// update("agents", agentsArray);

// Creates hash_ids for newly created objects
const hashId = () => {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

// This is the zustand store
export const useStore = create((set) => ({
	// States
	currentQuery: "",
	query: "",
	searchResults: [],
	loadingSearch: false,

	users: [],
	agents: [],
	projects: [],
	kbs: [],
	clients: [],
	favorites: [],

	// Generic functions
	update: (key, newState) =>
		set(() => ({
			[key]: newState
		})),

	add: (key, item) =>
		set((state) => {
			if (!Array.isArray(state[key])) return state;
			const newItem = Array.isArray(item)
				? item.map((i) => ({ id: i.id || hashId(), ...i }))
				: [{ id: item.id || hashId(), ...item }];
			return { [key]: [...state[key], ...newItem] };
		}),
	edit: (key, id, updatedData) =>
		set((state) => {
			if (!Array.isArray(state[key])) return state;
			return {
				[key]: state[key].map((obj) =>
					obj.id === id ? { ...obj, ...updatedData } : obj
				),
			};
		}),
	remove: (key, id) =>
		set((state) => {
			if (!Array.isArray(state[key])) return state;
			return {
				[key]: state[key].filter((obj) => obj.id !== id),
			};
		}),
	removeFav: (key, message_id) =>
		set((state) => {
			if (!Array.isArray(state[key])) return state;
			return {
				[key]: state[key].filter((obj) => obj.message_id !== message_id),
			};
		}),
	removeSessionFromAgent: (agentId, sessionKey) =>
		set((state) => {
			if (!Array.isArray(state.agents)) return state;
			return {
				agents: state.agents.map((agent) =>
					agent.id === agentId
						? {
							...agent,
							chat_sessions: (agent.chat_sessions || []).filter(
								(session) => session.session_key !== sessionKey
							),
						}
						: agent
				),
			};
		}),
}));
