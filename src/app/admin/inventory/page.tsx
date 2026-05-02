"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Package, Search, Edit2, Trash2 } from "lucide-react";
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
import { Product, InventoryItem } from "@/types";
import { formatDate, getStatusColor } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterProductId, setFilterProductId] = useState<string>("");
  const [filterProductName, setFilterProductName] = useState<string>("");
  const itemsPerPage = 20;
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("EDIT_INVENTORY");
  const canDelete = hasPermission("DELETE_INVENTORY");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadProducts();

    // Check for productId query parameter
    const productId = searchParams.get("productId");
    const productName = searchParams.get("productName");
    if (productId) {
      setFilterProductId(productId);
      setFilterProductName(productName || "");
    }
  }, [searchParams]);

  useEffect(() => {
    loadInventory();
  }, [currentPage, filterStatus, filterProductId]);

  const loadProducts = async () => {
    try {
      const productsRes = await api.get("/products", {
        params: { limit: 1000 }, // Increase limit to show all products
      });
      const productsData = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data?.products || [];
      setProducts(productsData);
    } catch (error: any) {
      console.error("Load products error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load products",
        variant: "destructive",
      });
      setProducts([]);
    }
  };

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const inventoryRes = await api.get("/products/inventory", {
        params: {
          search: searchQuery || undefined,
          status: filterStatus || undefined,
          productId: filterProductId || undefined,
          page: currentPage,
          limit: itemsPerPage,
        },
      });

      const inventoryData = Array.isArray(inventoryRes.data)
        ? inventoryRes.data
        : inventoryRes.data?.items || [];

      setInventory(inventoryData);
      setTotalPages(inventoryRes.data.pagination?.totalPages || 1);
      setTotalItems(inventoryRes.data.pagination?.total || 0);
    } catch (error: any) {
      console.error("Load inventory error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load inventory",
        variant: "destructive",
      });
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([loadProducts(), loadInventory()]);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadInventory();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const clearProductFilter = () => {
    setFilterProductId("");
    setFilterProductName("");
    setCurrentPage(1);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setEditingItem(null);
    loadInventory();
  };

  const handleDeleteClick = (item: any) => {
    setDeletingItem(item);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    try {
      await api.delete(`/products/inventory/${deletingItem.id}`);
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
      setShowDeleteDialog(false);
      setDeletingItem(null);
      loadInventory();
    } catch (error: any) {
      console.error("Delete inventory error:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to delete inventory item",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const statusCounts = {
    all: totalItems,
    AVAILABLE: inventory.filter((i) => i.status === "AVAILABLE").length,
    SOLD: inventory.filter((i) => i.status === "SOLD").length,
    RESERVED: inventory.filter((i) => i.status === "RESERVED").length,
  };

  if (showForm) {
    return (
      <InventoryForm
        products={products}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track items with IMEI/Serial numbers</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </div>

      {/* Product Filter Badge */}
      {filterProductId && (
        <Badge variant="default" className="px-4 py-2 text-sm">
          Filtering: {filterProductName}
          <button onClick={clearProductFilter} className="ml-2 hover:bg-white/20 rounded-full p-0.5">✕</button>
        </Badge>
      )}

      {/* Status Filter Cards — 2 col mobile, 4 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { key: "", label: "All Items", bg: "bg-gray-50", text: "text-gray-700" },
          { key: "AVAILABLE", label: "Available", bg: "bg-blue-50", text: "text-blue-700" },
          { key: "SOLD", label: "Sold", bg: "bg-gray-50", text: "text-gray-700" },
          { key: "RESERVED", label: "Reserved", bg: "bg-yellow-50", text: "text-yellow-700" },
        ].map((status) => (
          <Card
            key={status.key}
            className={`cursor-pointer transition-all border-gray-100 ${filterStatus === status.key ? "ring-2 ring-cyan-500" : ""}`}
            onClick={() => handleStatusFilter(status.key)}
          >
            <CardContent className="p-4">
              <p className="text-xs sm:text-sm text-gray-500">{status.label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${status.text}`}>
                {status.key === "" ? totalItems : statusCounts[status.key as keyof typeof statusCounts]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search product or IMEI/Serial…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} variant="outline">Search</Button>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Inventory Items
            <span className="ml-2 text-sm font-normal text-gray-400">({totalItems})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No inventory items found</p>
              <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />Add First Item
              </Button>
            </div>
          ) : (
            <>
              {/* ── Mobile card list ── */}
              <div className="sm:hidden divide-y divide-gray-100">
                {inventory.map((item) => (
                  <div key={item.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.product?.name || "-"}</p>
                        <p className="text-xs font-mono text-gray-500">{item.serialNumber}</p>
                        <p className="text-xs text-gray-400">{item.product?.category?.name || "-"}</p>
                        {item.registeredUnder && (
                          <p className="text-xs text-gray-500 mt-0.5">Reg: {item.registeredUnder}</p>
                        )}
                        {item.contract?.contractNumber && (
                          <p className="text-xs font-mono text-gray-500">Contract: {item.contract.contractNumber}</p>
                        )}
                        {item.contract?.createdBy && (
                          <p className="text-xs text-gray-400">Agent: {item.contract.createdBy.firstName} {item.contract.createdBy.lastName}</p>
                        )}
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <Badge className={getStatusColor(item.status)} >{item.status}</Badge>
                          <Badge
                            variant={item.lockStatus === "LOCKED" ? "destructive" : "default"}
                            className={item.lockStatus !== "LOCKED" ? "bg-green-100 text-green-800" : ""}
                          >
                            {item.lockStatus || "UNLOCKED"}
                          </Badge>
                        </div>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-1 shrink-0">
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && item.status === "AVAILABLE" && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(item)} className="text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial/IMEI</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lock Status</TableHead>
                      <TableHead>Registered Under</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Agent</TableHead>
                      {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.serialNumber}</TableCell>
                        <TableCell>{item.product?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.product?.category?.name || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.lockStatus === "LOCKED" ? "destructive" : "default"}
                            className={item.lockStatus === "UNLOCKED" ? "bg-green-100 text-green-800" : ""}
                          >
                            {item.lockStatus || "UNLOCKED"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{item.registeredUnder || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{item.contract?.contractNumber || "-"}</TableCell>
                        <TableCell>
                          {item.contract?.createdBy ? (
                            <span className="text-xs text-gray-700">{item.contract.createdBy.firstName} {item.contract.createdBy.lastName}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell>
                            <div className="flex gap-1">
                              {canEdit && (
                                <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && item.status === "AVAILABLE" && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
        {!isLoading && inventory.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update lock status and registered under information for{" "}
              {editingItem?.serialNumber}
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <EditInventoryForm
              item={editingItem}
              onClose={() => setShowEditDialog(false)}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item?
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Serial Number:</span>
                    <p className="font-mono font-medium">
                      {deletingItem?.serialNumber}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Product:</span>
                    <p className="font-medium">{deletingItem?.product?.name}</p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InventoryForm({
  products,
  onClose,
  onSuccess,
}: {
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    productId: "",
    serialNumber: "",
    lockStatus: "UNLOCKED",
    registeredUnder: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Debug logging
  console.log("InventoryForm - Products prop:", products);
  console.log("InventoryForm - Products length:", products?.length);
  console.log("InventoryForm - Search query:", searchQuery);

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    const matchesName = product.name?.toLowerCase().includes(query);
    const matchesCategory = product.category?.name
      ?.toLowerCase()
      .includes(query);
    const result = matchesName || matchesCategory;
    if (searchQuery) {
      console.log("Filter check:", {
        product: product.name,
        query,
        matchesName,
        matchesCategory,
        result,
      });
    }
    return result;
  });

  console.log(
    "InventoryForm - Filtered products count:",
    filteredProducts.length
  );
  console.log(
    "InventoryForm - Should show dropdown?",
    searchQuery && !selectedProduct
  );

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setFormData({ ...formData, productId: product.id });
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/products/inventory", formData);
      toast({
        title: "Success",
        description: "Inventory item added successfully",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to add inventory item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add Inventory Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Search and Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Search Product *
              </label>
              <Input
                placeholder="Search by product name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Selected Product Display */}
              {selectedProduct && (
                <div className="mt-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">
                        {selectedProduct.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Category: {selectedProduct.category?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Base Price: GHS {selectedProduct.basePrice}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(null);
                        setFormData({ ...formData, productId: "" });
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}

              {/* Product Search Results */}
              {searchQuery && !selectedProduct && (
                <div className="mt-2 max-h-64 overflow-y-auto border rounded-lg bg-white shadow-lg">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No products found for &quot;{searchQuery}&quot;</p>
                      <p className="text-xs mt-1">
                        Available products: {products.length}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleProductSelect(product)}
                        >
                          <p className="font-medium">{product.name}</p>
                          <div className="flex gap-4 text-sm text-gray-600 mt-1">
                            <span>
                              Category: {product.category?.name || "N/A"}
                            </span>
                            <span>Price: GHS {product.basePrice}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Show hint when no search query */}
              {!searchQuery && !selectedProduct && products.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Start typing to search from {products.length} available
                  products
                </p>
              )}
            </div>

            {/* Serial Number Input - Only shown when product is selected */}
            {selectedProduct && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Serial Number / IMEI *
                  </label>
                  <Input
                    required
                    placeholder="e.g., IMEI123456789 or Serial Number"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumber: e.target.value })
                    }
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the unique serial number or IMEI for this specific
                    item
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Lock Status (Optional)
                  </label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={formData.lockStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, lockStatus: e.target.value })
                    }
                  >
                    <option value="UNLOCKED">Unlocked</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Indicates if the device is locked or unlocked
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Registered Under (Optional)
                  </label>
                  <Input
                    placeholder="e.g., John Doe or Customer Name"
                    value={formData.registeredUnder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registeredUnder: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Name of person or entity the device is registered to
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || !selectedProduct}
                className="flex-1"
              >
                {isSubmitting ? "Adding..." : "Add Inventory Item"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function EditInventoryForm({
  item,
  onClose,
  onSuccess,
}: {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    productId: item.productId || "",
    lockStatus: item.lockStatus || "UNLOCKED",
    registeredUnder: item.registeredUnder || "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(item.product || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsRes = await api.get("/products", {
        params: { limit: 1000 },
      });
      const productsData = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data?.products || [];
      setProducts(productsData);
    } catch (error: any) {
      console.error("Load products error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load products",
        variant: "destructive",
      });
      setProducts([]);
    }
  };

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    const matchesName = product.name?.toLowerCase().includes(query);
    const matchesCategory = product.category?.name
      ?.toLowerCase()
      .includes(query);
    return matchesName || matchesCategory;
  });

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setFormData({ ...formData, productId: product.id });
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.put(`/products/inventory/${item.id}`, formData);
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Update inventory error:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to update inventory item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {/* Current Item Info (Read-only) */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Serial Number:</span>
              <p className="font-mono font-medium">{item.serialNumber}</p>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <p className="font-medium">{item.status}</p>
            </div>
            {item.contract && (
              <div className="col-span-2">
                <span className="text-gray-600">Contract:</span>
                <p className="font-mono text-sm">
                  {item.contract.contractNumber}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Product Search and Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Product *
          </label>

          {/* Selected Product Display */}
          {selectedProduct && (
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">
                    {selectedProduct.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Category: {selectedProduct.category?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Base Price: GHS {selectedProduct.basePrice}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(null);
                    setFormData({ ...formData, productId: "" });
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Product Search Input */}
          {!selectedProduct && (
            <>
              <Input
                placeholder="Search by product name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Product Search Results */}
              {searchQuery && (
                <div className="mt-2 max-h-64 overflow-y-auto border rounded-lg bg-white shadow-lg">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No products found for &quot;{searchQuery}&quot;</p>
                      <p className="text-xs mt-1">
                        Available products: {products.length}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleProductSelect(product)}
                        >
                          <p className="font-medium">{product.name}</p>
                          <div className="flex gap-4 text-sm text-gray-600 mt-1">
                            <span>
                              Category: {product.category?.name || "N/A"}
                            </span>
                            <span>Price: GHS {product.basePrice}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Show hint when no search query */}
              {!searchQuery && products.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Start typing to search from {products.length} available products
                </p>
              )}
            </>
          )}
        </div>

        {/* Lock Status */}
        <div>
          <label className="block text-sm font-medium mb-2">Lock Status</label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm"
            value={formData.lockStatus}
            onChange={(e) =>
              setFormData({ ...formData, lockStatus: e.target.value })
            }
          >
            <option value="UNLOCKED">Unlocked</option>
            <option value="LOCKED">Locked</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Indicates if the device is locked or unlocked
          </p>
        </div>

        {/* Registered Under */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Registered Under
          </label>
          <Input
            placeholder="e.g., John Doe or Customer Name"
            value={formData.registeredUnder}
            onChange={(e) =>
              setFormData({ ...formData, registeredUnder: e.target.value })
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            Name of person or entity the device is registered to
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !selectedProduct}>
          {isSubmitting ? "Updating..." : "Update Inventory"}
        </Button>
      </div>
    </form>
  );
}
