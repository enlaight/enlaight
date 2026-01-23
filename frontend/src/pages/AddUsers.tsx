import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock existing emails for duplicate checking
const existingEmails = [
  'sarah.johnson@company.com',
  'michael.chen@company.com',
  'emily.rodriguez@company.com',
  'david.thompson@company.com',
  'lisa.wang@company.com',
  'james.miller@company.com'
];

type UserFormData = {
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Member' | '';
  status: 'Active' | 'Inactive';
  password: string;
};

const AddUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: '',
    status: 'Active',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 80) {
      newErrors.name = 'Name must be no more than 80 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (existingEmails.includes(formData.email.toLowerCase())) {
      newErrors.email = 'This email is already registered';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Password validation (optional but if provided, min 8 chars)
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock API call - simulate delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create new user (in real app, this would be an API call)
      const newUser = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name.trim(),
        email: formData.email.toLowerCase(),
        role: formData.role as 'Admin' | 'Manager' | 'Member',
        status: formData.status,
        department: formData.role === 'Admin' ? 'Administration' : 'General',
        joinDate: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      toast({
        title: "User Created",
        description: `${newUser.name} has been successfully added.`,
      });

      // Navigate back to user management
      navigate('/usermanagement');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/usermanagement');
  };

  const isFormValid = formData.name.trim().length >= 2 &&
                     formData.name.trim().length <= 80 &&
                     /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
                     !existingEmails.includes(formData.email.toLowerCase()) &&
                     formData.role &&
                     (!formData.password || formData.password.length >= 8);

  return (
    <div className="min-h-screen flex items-start justify-center p-4 bg-gray-200">
      <div className="w-full max-w-2xl">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2 py-0 pt-4">
              <img src="/lovable-uploads/afbb03bf-9c74-4012-a5cb-a042e619797e.png" alt="ENLAIGHT" className="h-12 w-auto" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <UserPlus className="h-6 w-6" />
                Add New User
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Create a new user account with the required information
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  className={errors.name ? 'border-destructive' : ''}
                  maxLength={80}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.name.length}/80 characters
                </p>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Role Field */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  Role <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.role} onValueChange={(value: 'Admin' | 'Manager' | 'Member') => handleInputChange('role', value)}>
                  <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role}</p>
                )}
              </div>

              {/* Status Field */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(value: 'Active' | 'Inactive') => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password (min 8 characters)"
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                {formData.password && (
                  <p className="text-xs text-muted-foreground">
                    Password strength: {formData.password.length >= 8 ? 'Good' : 'Too short'}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 sm:flex-none"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddUsers;
