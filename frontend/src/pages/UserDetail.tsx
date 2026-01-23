import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mail, Calendar, Building, User, Shield } from 'lucide-react';

// Mock user data (same as in ListUsers)
const mockUsers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'Product Manager',
    avatar: null,
    status: 'active',
    department: 'Product',
    joinDate: '2023-01-15',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    manager: 'Alice Smith',
    employeeId: 'EMP001',
    lastActive: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'Senior Developer',
    avatar: null,
    status: 'active',
    department: 'Engineering',
    joinDate: '2022-08-22',
    phone: '+1 (555) 234-5678',
    location: 'Austin, TX',
    manager: 'Bob Wilson',
    employeeId: 'EMP002',
    lastActive: '2024-01-20T14:15:00Z'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    role: 'UX Designer',
    avatar: null,
    status: 'inactive',
    department: 'Design',
    joinDate: '2023-03-10',
    phone: '+1 (555) 345-6789',
    location: 'New York, NY',
    manager: 'Carol Davis',
    employeeId: 'EMP003',
    lastActive: '2024-01-15T09:00:00Z'
  },
  {
    id: '4',
    name: 'David Thompson',
    email: 'david.thompson@company.com',
    role: 'DevOps Engineer',
    avatar: null,
    status: 'active',
    department: 'Engineering',
    joinDate: '2022-11-05',
    phone: '+1 (555) 456-7890',
    location: 'Seattle, WA',
    manager: 'Bob Wilson',
    employeeId: 'EMP004',
    lastActive: '2024-01-20T16:45:00Z'
  },
  {
    id: '5',
    name: 'Lisa Wang',
    email: 'lisa.wang@company.com',
    role: 'Marketing Director',
    avatar: null,
    status: 'active',
    department: 'Marketing',
    joinDate: '2021-06-18',
    phone: '+1 (555) 567-8901',
    location: 'Los Angeles, CA',
    manager: 'Frank Miller',
    employeeId: 'EMP005',
    lastActive: '2024-01-20T11:20:00Z'
  },
  {
    id: '6',
    name: 'James Miller',
    email: 'james.miller@company.com',
    role: 'Sales Manager',
    avatar: null,
    status: 'active',
    department: 'Sales',
    joinDate: '2023-02-28',
    phone: '+1 (555) 678-9012',
    location: 'Chicago, IL',
    manager: 'Grace Lee',
    employeeId: 'EMP006',
    lastActive: '2024-01-20T13:30:00Z'
  }
];

const UserDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Find user by ID
  const user = mockUsers.find(u => u.id === id);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-200">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground">
                User Not Found
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                The requested user could not be found.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/listusers')} className="w-full">
                Back to User List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-200">
      <div className="w-full max-w-2xl">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2 py-0 pt-4">
              <img src="/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png" alt="ENLAIGHT" className="h-12 w-auto" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <User className="h-6 w-6" />
                User Profile
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Detailed user information
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Header */}
            <div className="flex flex-col items-center space-y-4 text-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
                  <Badge className={getStatusColor(user.status)}>
                    {user.status}
                  </Badge>
                </div>
                <p className="text-lg text-muted-foreground">{user.role}</p>
                <p className="text-sm text-muted-foreground">Employee ID: {user.employeeId}</p>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 text-muted-foreground">📱</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phone</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Work Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Department</p>
                    <p className="text-sm text-muted-foreground">{user.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Manager</p>
                    <p className="text-sm text-muted-foreground">{user.manager}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Join Date</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 text-muted-foreground">📍</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Location</p>
                    <p className="text-sm text-muted-foreground">{user.location}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Activity Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Activity</h3>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 text-muted-foreground">⏰</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Last Active</p>
                  <p className="text-sm text-muted-foreground">{formatLastActive(user.lastActive)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-border">
              <Button
                onClick={() => navigate('/listusers')}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to User List
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDetail;
