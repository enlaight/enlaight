import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, Edit, Trash2, UserCheck, UserX, MoreHorizontal, KeyRound, UserRoundCog } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import AddUserModal from '@/components/AddUserModal';
import SendResetEmailModal from '@/components/SendResetEmailModal';
import ManualResetModal from '@/components/ManualResetModal';
import { listUsers } from '@/services/UserService';

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'ADMINISTRATOR' | 'MANAGER' | 'USER';
  active: boolean;
  avatarUrl?: string | null;
  department: string;
  joinDate: string;
  lastActive: string;
  lastResetEmailAt?: string;
  requirePasswordChange?: boolean;
  createdAt: string;
  updatedAt: string;
};

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Sidebar state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const [sendResetUser, setSendResetUser] = useState<User | null>(null);
  const [manualResetUser, setManualResetUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch users first so the modal always shows results even if projects fail (e.g., 401)
        const userPage = await listUsers(1, 100, "");

        if (!cancelled) {
          const results = Array.isArray(userPage?.results) ? userPage.results : [];
          setUsers(results);
        }

      } catch (e: any) {
        if (!cancelled) console.error(e.message ?? "Error fetching users");
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user?.first_name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      user?.last_name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      user?.role?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      user?.department?.toLowerCase().includes(searchTerm?.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role?.toLowerCase().includes(roleFilter?.toLowerCase());
    const matchesStatus = statusFilter === 'all';

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getInitials = (first_name: string, last_name: string) => {
    const full_name = first_name + ' ' + last_name;
    return full_name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: boolean) => {
    switch (status) {
      case true:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case false:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const handleViewUser = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    toast({
      title: "User Deleted",
      description: `${userName} has been successfully deleted.`,
    });
  };

  const handleToggleUserStatus = (userId: string, userName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    toast({
      title: "Status Updated",
      description: `${userName} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`,
    });
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      toast({
        title: "User Updated",
        description: `${editingUser.first_name} has been successfully updated.`,
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    }
  };

  const handleUserAdded = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
    setHighlightedUserId(newUser.id);
    // Remove highlight after 3 seconds
    setTimeout(() => setHighlightedUserId(null), 3000);
  };

  const handleEmailSent = (userId: string) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, lastResetEmailAt: new Date().toISOString() }
        : user
    ));
  };

  const handlePasswordReset = (userId: string, requireChange: boolean) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, requirePasswordChange: requireChange, updatedAt: new Date().toISOString() }
        : user
    ));
  };

  const getExistingEmails = () => {
    return users.map(user => user.email?.toLowerCase());
  };

  return (
    <>
      <main className="container mt-5"
        role="main"
        aria-label="User Management"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserRoundCog className="h-6 w-6 text-primary" />
                {t('userManagement.title')}
              </h1>
              <p className="text-gray-600 text-sm">{t('userManagement.managePermissions')}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('userManagement.searchUsers')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                </SelectContent>
              </Select>
              {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                {t('userManagement.addUser')}
              </Button>
              */}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            </div>
          )}

          {/* Users Table */}
          {!loading && (
            filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600 mb-6">
                  Get started by adding your first user to the system.
                </p>
                {/* <Button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New User
              </Button> */}
              </div>
            ) : (
              <TooltipProvider>
                <div className="rounded-md border overflow-x-auto">
                  <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                    <Table className="w-full table-fixed">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 p-3">Avatar</TableHead>
                          <TableHead className="w-44 p-3">User</TableHead>
                          <TableHead className="w-36 p-3">Email</TableHead>
                          <TableHead className="w-32 p-3">Role</TableHead>
                          <TableHead className="w-20 p-3">Status</TableHead>
                          <TableHead className="w-32 p-3 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow
                            key={user.id}
                            className={`hover:bg-muted/50 transition-colors ${highlightedUserId === user.id ? 'bg-accent/50 animate-pulse' : ''
                              }`}
                          >
                            <TableCell className="p-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                  {getInitials(user.first_name, user.last_name)}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="p-3">
                              <div>
                                <p className="font-medium text-foreground text-sm truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                              </div>
                            </TableCell>
                            <TableCell className="p-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate max-w-[200px] cursor-help">
                                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{user.email}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="p-3">
                              <p className="text-sm font-medium text-foreground">{user.role}</p>
                            </TableCell>
                            <TableCell className="p-3">
                              <Badge className={getStatusColor(user.active)} variant="secondary">
                                {user.active ? 'active' : 'inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-3">
                              <div className="flex items-center justify-end gap-1">
                                {/* <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewUser(user.id)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>View Details</p></TooltipContent>
                              </Tooltip> */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditUser(user)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit User</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleUserStatus(user.id, user.first_name + ' ' + user.last_name, user.status)}
                                      className="h-7 w-7 p-0"
                                    >
                                      {user.status === 'active' ? (
                                        <UserX className="h-3.5 w-3.5 text-orange-600" />
                                      ) : (
                                        <UserCheck className="h-3.5 w-3.5 text-green-600" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{user.status === 'active' ? 'Deactivate' : 'Activate'} User</p>
                                  </TooltipContent>
                                </Tooltip>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 bg-background border border-border z-50">
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="flex items-center">
                                        <KeyRound className="h-4 w-4 mr-2" />
                                        Reset Password
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="bg-background border border-border z-50">
                                        <DropdownMenuItem onClick={() => setSendResetUser(user)}>
                                          Send Reset Email...
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setManualResetUser(user)}>
                                          Manual Reset...
                                        </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete User
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-background border border-border z-50">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete {user.full_name}? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TooltipProvider>
            ))}

          {/* Results summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
            <p>
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </div>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} >
        <DialogContent className="bg-background border border-border z-50">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input id="edit-name" defaultValue={editingUser.full_name} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">Email</Label>
                <Input id="edit-email" defaultValue={editingUser.email} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">Role</Label>
                <Input id="edit-role" defaultValue={editingUser.role} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">Status</Label>
                <Select defaultValue={editingUser.status}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Add User Modal */}
      < AddUserModal
        open={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={handleUserAdded}
        existingEmails={getExistingEmails()}
      />

      {/* Password Reset Modals */}
      < SendResetEmailModal
        open={!!sendResetUser}
        onClose={() => setSendResetUser(null)}
        user={sendResetUser}
        onEmailSent={handleEmailSent}
      />

      <ManualResetModal
        open={!!manualResetUser}
        onClose={() => setManualResetUser(null)}
        user={manualResetUser}
        onPasswordReset={handlePasswordReset}
      />
    </>
  );
};

export default UserManagement;
