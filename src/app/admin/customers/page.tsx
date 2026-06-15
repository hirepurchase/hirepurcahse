"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Eye, RotateCcw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import api from "@/lib/api";
import { Customer } from "@/types";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetPhone, setResetPhone] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowForm(true);
    }
    loadCustomers();
  }, [searchParams, currentPage]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/customers", {
        params: {
          search: searchQuery || undefined,
          page: currentPage,
          limit: itemsPerPage,
        },
      });
      setCustomers(response.data.customers || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalItems(response.data.pagination?.total || 0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCustomers();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteCustomer = async (customer: any) => {
    if (customer.contractsCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `This customer has ${customer.contractsCount} contract(s). Cannot delete customers with existing contracts.`,
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${customer.firstName} ${customer.lastName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/customers/${customer.id}`);
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
      loadCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const handleResetAccount = async () => {
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      const phone = resetPhone.trim() || resetTarget.phone;
      await api.post(`/customers/${resetTarget.id}/reset-account`, { phone });
      setResetSuccess({
        name: `${resetTarget.firstName} ${resetTarget.lastName}`,
        membershipId: resetTarget.membershipId,
        phone,
      });
      setResetTarget(null);
      setResetPhone("");
      loadCustomers();
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.response?.data?.error || "Failed to reset account",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (showForm) {
    return (
      <CustomerRegistrationForm
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          loadCustomers();
        }}
      />
    );
  }

  if (editingCustomer) {
    return (
      <CustomerEditForm
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSuccess={() => {
          setEditingCustomer(null);
          loadCustomers();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customer accounts and memberships</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">Register Customer</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search name, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} size="sm" className="shrink-0">Search</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500 mb-4">No customers found</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Register First Customer
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                      {customer.photoUrl ? (
                        <img src={customer.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                          {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-xs text-gray-500 font-mono truncate">{customer.membershipId}</p>
                      <p className="text-xs text-gray-400">{customer.phone}</p>
                      {customer.createdBy && (
                        <p className="text-xs text-gray-400 truncate">By: {customer.createdBy.firstName} {customer.createdBy.lastName}</p>
                      )}
                    </div>
                    {/* Status + actions */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <Badge variant={customer.isActivated ? "default" : "secondary"} className="text-[10px]">
                        {customer.isActivated ? "Active" : "Pending"}
                      </Badge>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => router.push(`/admin/customers/${customer.id}`)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingCustomer(customer)}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setResetTarget(customer); setResetPhone(customer.phone); }}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Reset"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          disabled={customer.contractsCount > 0}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo</TableHead>
                      <TableHead>Membership ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contracts</TableHead>
                      <TableHead>Registered By</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                            {customer.photoUrl ? (
                              <img
                                src={customer.photoUrl}
                                alt={`${customer.firstName} ${customer.lastName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">' + customer.firstName.charAt(0) + customer.lastName.charAt(0) + '</div>';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                                {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{customer.membershipId}</TableCell>
                        <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={customer.isActivated ? "default" : "secondary"}>
                            {customer.isActivated ? "Active" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.contractsCount || 0}</TableCell>
                        <TableCell>
                          {customer.createdBy ? (
                            <span className="text-sm text-gray-700">{customer.createdBy.firstName} {customer.createdBy.lastName}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(customer.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCustomer(customer)}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="text-amber-600 hover:bg-amber-50 border-amber-300" onClick={() => { setResetTarget(customer); setResetPhone(customer.phone); }}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Reset
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteCustomer(customer)} disabled={customer.contractsCount > 0}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
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
        {!isLoading && customers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        )}
      </Card>

      {/* Reset Account Confirm Dialog */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reset Customer Account</h2>
                <p className="text-sm text-gray-500">This will reset login credentials</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium mb-1">
                Account: <span className="font-bold">{resetTarget.firstName} {resetTarget.lastName}</span>
              </p>
              <p className="text-sm text-amber-700">
                The <strong>password</strong> will be set to the phone number below. Edit if needed:
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number (used as password)</label>
              <Input
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value)}
                placeholder="Enter phone number"
                className="font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">The customer&apos;s MembershipID is not changed. Only the password is reset.</p>
            </div>

            <p className="text-sm text-gray-600 mb-5">
              The customer can change their password after logging in. This action is logged in the audit trail.
            </p>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setResetTarget(null)} disabled={isResetting}>
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleResetAccount}
                disabled={isResetting}
              >
                {isResetting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Resetting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset Account
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Dialog */}
      {resetSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Account Reset Successful</h2>
                <p className="text-sm text-gray-500">{resetSuccess.name}</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
              <p className="text-sm text-green-800 font-semibold mb-3">New Login Credentials:</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded border border-green-200 px-3 py-2">
                  <span className="text-xs text-gray-500">Username (Phone)</span>
                  <span className="font-mono font-bold text-gray-800">{resetSuccess.phone}</span>
                </div>
                <div className="flex justify-between items-center bg-white rounded border border-green-200 px-3 py-2">
                  <span className="text-xs text-gray-500">Password</span>
                  <span className="font-mono font-bold text-gray-800">{resetSuccess.phone}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Please share these credentials with the customer. They should change their password after first login.
            </p>

            <Button className="w-full" onClick={() => setResetSuccess(null)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerRegistrationForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    nationalId: "",
    dateOfBirth: "",
    guarantorName: "",
    guarantorPhone: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  const validateImageFile = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG or PNG image only",
        variant: "destructive",
      });
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handlePhotoChange = (file: File | null) => {
    if (!file) return;

    if (!validateImageFile(file)) {
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      const captureBtn = document.createElement("button");
      captureBtn.textContent = "Capture Photo";
      captureBtn.style.cssText =
        "margin-top:1rem;padding:0.5rem 1rem;background:#3b82f6;color:white;border:none;border-radius:0.375rem;cursor:pointer;";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText =
        "margin-top:1rem;margin-left:0.5rem;padding:0.5rem 1rem;background:#6b7280;color:white;border:none;border-radius:0.375rem;cursor:pointer;";

      const btnContainer = document.createElement("div");
      btnContainer.appendChild(captureBtn);
      btnContainer.appendChild(cancelBtn);

      const modal = document.createElement("div");
      modal.style.cssText =
        "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;";
      modal.appendChild(video);
      modal.appendChild(btnContainer);
      document.body.appendChild(modal);

      captureBtn.onclick = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
            handlePhotoChange(file);
          }
          stream.getTracks().forEach((track) => track.stop());
          document.body.removeChild(modal);
        }, "image/jpeg");
      };

      cancelBtn.onclick = () => {
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(modal);
      };
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoFile) {
      toast({ title: "Photo Required", description: "Please upload a customer photo before registering.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key as keyof typeof formData]);
      });
      submitData.append("photo", photoFile);

      const response = await api.post("/customers", submitData);
      toast({
        title: "Customer Registered",
        description: `Membership ID: ${response.data.membershipId}`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description:
          error.response?.data?.error || "Failed to register customer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Register New Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Info */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <Input
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name *</label>
                  <Input
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number *</label>
                  <Input
                    required
                    type="tel"
                    placeholder="0200000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">National ID *</label>
                  <Input
                    required
                    placeholder="GHA-000000000-0"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Guarantor */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Guarantor Details</h3>
              <p className="text-xs text-blue-600">Person who guarantees the customer&apos;s hire purchase agreement.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Guarantor Name</label>
                  <Input
                    placeholder="Full name"
                    value={formData.guarantorName}
                    onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Guarantor Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="0200000000"
                    value={formData.guarantorPhone}
                    onChange={(e) => setFormData({ ...formData, guarantorPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Customer Photo <span className="text-red-500">*</span>
              </h3>
              <div>
              <label className="block text-sm font-medium mb-2 sr-only">
                Customer Photo *
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
              >
                {photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview}
                      alt="Customer preview"
                      className="max-w-xs mx-auto rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview("");
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Drag & drop photo here, or click to browse
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("photo-input")?.click()
                        }
                      >
                        Browse Files
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCameraCapture}
                      >
                        Take Photo
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      JPEG or PNG only, max 5MB
                    </p>
                  </div>
                )}
                <input
                  id="photo-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Registering..." : "Register Customer"}
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

function CustomerEditForm({
  customer,
  onClose,
  onSuccess,
}: {
  customer: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: customer.firstName || "",
    lastName: customer.lastName || "",
    phone: customer.phone || "",
    address: customer.address || "",
    nationalId: customer.nationalId || "",
    dateOfBirth: customer.dateOfBirth
      ? new Date(customer.dateOfBirth).toISOString().split("T")[0]
      : "",
    guarantorName: customer.guarantorName || "",
    guarantorPhone: customer.guarantorPhone || "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(customer.photoUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("firstName", formData.firstName);
      submitData.append("lastName", formData.lastName);
      submitData.append("phone", formData.phone);
      submitData.append("address", formData.address);
      submitData.append("nationalId", formData.nationalId);
      submitData.append("guarantorName", formData.guarantorName);
      submitData.append("guarantorPhone", formData.guarantorPhone);
      if (formData.dateOfBirth) {
        submitData.append("dateOfBirth", formData.dateOfBirth);
      }
      if (photoFile) {
        submitData.append("photo", photoFile);
      }

      await api.put(`/customers/${customer.id}`, submitData);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Customer — {customer.membershipId}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Customer Photo</label>
              <div className="flex items-center gap-4">
                {photoPreview && (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 shrink-0">
                    <img src={photoPreview} alt="Customer" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <Input type="file" accept="image/*" onChange={handlePhotoChange} className="cursor-pointer" />
                  <p className="text-xs text-gray-500 mt-1">Upload to update (optional)</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name *</label>
                <Input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name *</label>
                <Input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <Input required type="tel" placeholder="0200000000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">National ID</label>
                <Input value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            </div>
            {/* Guarantor */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Guarantor Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Guarantor Name</label>
                  <Input
                    placeholder="Full name"
                    value={formData.guarantorName}
                    onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Guarantor Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="0200000000"
                    value={formData.guarantorPhone}
                    onChange={(e) => setFormData({ ...formData, guarantorPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Updating..." : "Update Customer"}
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
