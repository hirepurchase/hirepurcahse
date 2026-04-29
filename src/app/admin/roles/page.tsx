'use client';

import { useEffect, useState } from 'react';
import { Plus, Shield, Users, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/roles');
      setRoles(response.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load roles',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await api.get('/roles/permissions/all');
      setPermissions(response.data || []);
    } catch (error: any) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (role.isSystem) {
      toast({
        title: 'Cannot Delete',
        description: 'System roles cannot be deleted',
        variant: 'destructive',
      });
      return;
    }

    if (role._count?.adminUsers > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This role is assigned to ${role._count.adminUsers} user(s). Cannot delete roles that are in use.`,
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete role "${role.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/roles/${role.id}`);
      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      });
      loadRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete role',
        variant: 'destructive',
      });
    }
  };

  if (showForm) {
    return (
      <RoleForm
        role={editingRole}
        permissions={permissions}
        onClose={() => {
          setShowForm(false);
          setEditingRole(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setEditingRole(null);
          loadRoles();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage user roles and permissions</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Create Role</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            All Roles
            <span className="ml-2 text-sm font-normal text-gray-400">({roles.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No roles found</p>
              <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />Create First Role
              </Button>
            </div>
          ) : (
            <>
              {/* ── Mobile card list ── */}
              <div className="sm:hidden divide-y divide-gray-100">
                {roles.map((role) => (
                  <div key={role.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{role.name}</p>
                          {role.isSystem ? (
                            <Badge variant="default" className="text-[10px] shrink-0">System</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] shrink-0">Custom</Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{role.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span>{role.permissions?.length || 0} permissions</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />{role._count?.adminUsers || 0} users
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingRole(role); setShowForm(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteRole(role)}
                          disabled={role.isSystem || role._count?.adminUsers > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{role.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{role.permissions?.length || 0} permissions</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span>{role._count?.adminUsers || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {role.isSystem ? <Badge variant="default">System</Badge> : <Badge variant="secondary">Custom</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingRole(role); setShowForm(true); }}>
                              <Pencil className="h-3 w-3 mr-1" />Edit
                            </Button>
                            <Button
                              size="sm" variant="outline" className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteRole(role)}
                              disabled={role.isSystem || role._count?.adminUsers > 0}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleForm({
  role,
  permissions,
  onClose,
  onSuccess,
}: {
  role?: any;
  permissions: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissionIds: role?.permissions?.map((p: any) => p.id) || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (role) {
        await api.put(`/roles/${role.id}`, formData);
        toast({
          title: 'Success',
          description: 'Role updated successfully',
        });
      } else {
        await api.post('/roles', formData);
        toast({
          title: 'Success',
          description: 'Role created successfully',
        });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || `Failed to ${role ? 'update' : 'create'} role`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id: string) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  return (
    <div className="p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>{role ? `Edit Role: ${role.name}` : 'Create New Role'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Role Name *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={role?.isSystem}
                placeholder="e.g., Sales Manager"
              />
              {role?.isSystem && (
                <p className="text-xs text-gray-500 mt-1">System role names cannot be changed</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Permissions ({formData.permissionIds.length} selected)</label>
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissionIds.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-sm">{permission.name}</p>
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (role ? 'Updating...' : 'Creating...') : (role ? 'Update Role' : 'Create Role')}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
