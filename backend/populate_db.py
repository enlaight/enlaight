import os
import sys
import django
import random
import uuid
from datetime import datetime, timedelta
from django.contrib.auth.hashers import make_password

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
# Ensure project src is on path (backend/src)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
django.setup()

from authentication.models.user_profile import UserProfile
from authentication.models.clients import Clients
from authentication.models.projects import Projects
from authentication.models.agents import Agents
from authentication.models.chat_sessions import ChatSession
from authentication.models.expertise_area import ExpertiseArea

# Sample first and last names
FIRST_NAMES = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
CLIENT_NAMES = ['TechCorp', 'DataSystems', 'CloudInnovate', 'Digital Solutions', 'AI Ventures']
PROJECT_NAMES = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Project Delta', 'Project Epsilon']


def generate_username(first_name, last_name):
    """Generate unique username"""
    base = f"{first_name.lower()}.{last_name.lower()}"
    counter = 1
    username = base
    while UserProfile.objects.filter(username=username).exists():
        username = f"{base}{counter}"
        counter += 1
    return username


def generate_email(first_name, last_name):
    """Generate unique email"""
    base = f"{first_name.lower()}.{last_name.lower()}@enlaight.io"
    counter = 1
    email = base
    while UserProfile.objects.filter(email=email).exists():
        email = f"{first_name.lower()}.{last_name.lower()}{counter}@enlaight.io"
        counter += 1
    return email


def generate_session_key():
    """Generate mock session key"""
    return f"session_{uuid.uuid4().hex[:16]}"


print("=" * 60)
print("STARTING DATABASE POPULATION")
print("=" * 60)
print()

# Step 1: Create or get existing clients
print("Step 1: Creating/fetching clients...")
clients = []
for i, client_name in enumerate(CLIENT_NAMES[:3]):  # At least 3 clients
    client, created = Clients.objects.get_or_create(
        name=client_name,
        defaults={'id': str(uuid.uuid4())}
    )
    clients.append(client)
    status = "✓ Created" if created else "✓ Existing"
    print(f"  {status}: {client_name} (ID: {client.id})")
print()

# Step 2: Create projects (at least 3 total)
print("Step 2: Creating/fetching projects...")
projects = []
project_count = 0
for i, proj_name in enumerate(PROJECT_NAMES[:5]):
    client = clients[i % len(clients)]
    project, created = Projects.objects.get_or_create(
        name=proj_name,
        client=client,
        defaults={'id': str(uuid.uuid4())}
    )
    projects.append(project)
    status = "✓ Created" if created else "✓ Existing"
    print(f"  {status}: {proj_name} -> Client: {client.name} (ID: {project.id})")
    project_count += 1
    if project_count >= 3:
        break
print(f"  Total projects: {len(projects)}")
print()

# Step 3: Get or create agents (bots)
print("Step 3: Fetching available agents...")
agents = list(Agents.objects.all()[:5])
if not agents:
    print("  ⚠ Warning: No agents found in database. Creating sample agents...")
    expertise_areas = list(ExpertiseArea.objects.all())
    if not expertise_areas:
        area = ExpertiseArea.objects.create(name="General")
        expertise_areas = [area]
    
    sample_agents = [
        {
            'name': 'Data Analyzer',
            'description': 'Analyzes data and provides insights',
            'url_n8n': 'https://n8n.example.com/webhook/data-analyzer',
            'expertise_area': expertise_areas[0]
        },
        {
            'name': 'Support Bot',
            'description': 'Provides customer support',
            'url_n8n': 'https://n8n.example.com/webhook/support-bot',
            'expertise_area': expertise_areas[0] if len(expertise_areas) > 0 else None
        },
        {
            'name': 'Documentation Helper',
            'description': 'Helps with documentation',
            'url_n8n': 'https://n8n.example.com/webhook/doc-helper',
            'expertise_area': expertise_areas[0] if len(expertise_areas) > 0 else None
        }
    ]
    
    for agent_data in sample_agents:
        agent, created = Agents.objects.get_or_create(
            name=agent_data['name'],
            defaults={
                'id': str(uuid.uuid4()),
                'description': agent_data['description'],
                'url_n8n': agent_data['url_n8n'],
                'expertise_area': agent_data['expertise_area']
            }
        )
        agents.append(agent)

print(f"  ✓ Available agents: {len(agents)}")
for agent in agents[:5]:
    print(f"    - {agent.name} (ID: {agent.id})")
print()

# Step 4: Create 5 new users
print("Step 4: Creating 5 new random users...")
new_users = []
for i in range(5):
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    username = generate_username(first_name, last_name)
    email = generate_email(first_name, last_name)
    
    # Assign user to a random client from available clients
    user_client = random.choice(clients)
    
    try:
        user = UserProfile.objects.create(
            id=str(uuid.uuid4()),
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            full_name=f"{first_name} {last_name}",
            client=user_client,
            role='USER',
            is_active=True,
            is_staff=False,
            is_superuser=False,
            password=make_password('DefaultPassword123!')
        )
        new_users.append(user)
        print(f"  ✓ User {i+1}: {email}")
        print(f"    - Name: {first_name} {last_name}")
        print(f"    - Client: {user_client.name}")
        print(f"    - ID: {user.id}")
    except Exception as e:
        print(f"  ✗ Failed to create user {i+1}: {str(e)}")

print(f"\n  Total new users created: {len(new_users)}")
print()

# Step 5: Attach each user to a project
print("Step 5: Attaching users to projects...")
for i, user in enumerate(new_users):
    # Assign to a project that belongs to their client
    user_projects = [p for p in projects if p.client.id == user.client.id]
    if not user_projects:
        # If user's client has no projects, assign them to any project
        user_projects = projects
    
    assigned_project = random.choice(user_projects)
    user.projects.add(assigned_project)
    print(f"  ✓ {user.email} -> {assigned_project.name} (Client: {assigned_project.client.name})")

print()

# Step 6: Create chat sessions for each user
print("Step 6: Creating chat sessions for each user...")
total_sessions = 0
for user in new_users:
    # Get agents that belong to projects the user is assigned to
    user_assigned_projects = list(user.projects.all())
    
    if not user_assigned_projects:
        print(f"  ⚠ User {user.email} has no assigned projects, skipping sessions")
        continue
    
    # Get available agents for those projects
    available_agents = []
    for project in user_assigned_projects:
        project_agents = list(project.agents.all())
        available_agents.extend(project_agents)
    
    # If no project-specific agents, use any available agent
    if not available_agents:
        available_agents = agents
    
    # Create 2-5 sessions for this user
    num_sessions = random.randint(2, 5)
    for j in range(num_sessions):
        selected_agent = random.choice(available_agents) if available_agents else agents[0]
        
        try:
            session = ChatSession.objects.create(
                id=str(uuid.uuid4()),
                session_key=generate_session_key(),
                agent=selected_agent,
                user=user,
                data=f"Sample chat data for session {j+1}"
            )
            total_sessions += 1
            print(f"  ✓ {user.email} -> Session {j+1} with {selected_agent.name}")
        except Exception as e:
            print(f"  ✗ Failed to create session for {user.email}: {str(e)}")

print(f"\n  Total sessions created: {total_sessions}")
print()

# Summary
print("=" * 60)
print("POPULATION SUMMARY")
print("=" * 60)
print(f"Clients created/used: {len(clients)}")
print(f"Projects created/used: {len(projects)}")
print(f"New users created: {len(new_users)}")
print(f"Total chat sessions created: {total_sessions}")
print()
print("✓ Database population completed successfully!")
print()
