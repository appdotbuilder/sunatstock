
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  MedicalItem, 
  CreateMedicalItemInput, 
  RestockItemInput,
  CreateProcedureInput,
  CircumcisionProcedure,
  StockFilterInput,
  ItemCategory,
  StockStatus 
} from '../../server/src/schema';

// Dashboard Stats interface from the handler
interface DashboardStats {
  total_items: number;
  critical_items: number;
  procedures_today: number;
  total_procedures_this_month: number;
}

function App() {
  // State management
  const [items, setItems] = useState<MedicalItem[]>([]);
  const [procedures, setProcedures] = useState<CircumcisionProcedure[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_items: 0,
    critical_items: 0,
    procedures_today: 0,
    total_procedures_this_month: 0
  });
  const [lowStockItems, setLowStockItems] = useState<MedicalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Filter states
  const [itemFilter, setItemFilter] = useState<StockFilterInput>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isProcedureOpen, setIsProcedureOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MedicalItem | null>(null);

  // Form states
  const [newItemForm, setNewItemForm] = useState<CreateMedicalItemInput>({
    name: '',
    category: 'alat',
    unit: '',
    current_stock: 0,
    minimum_threshold: 0,
    purchase_price: null,
    image_path: null
  });

  const [restockForm, setRestockForm] = useState<RestockItemInput>({
    item_id: 0,
    quantity: 0,
    purchase_price: null,
    notes: null
  });

  const [procedureForm, setProcedureForm] = useState<CreateProcedureInput>({
    patient_name: null,
    procedure_date: new Date(),
    notes: null,
    items_used: []
  });

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [stats, lowStock] = await Promise.all([
        trpc.getDashboardStats.query(),
        trpc.getLowStockItems.query()
      ]);
      setDashboardStats(stats);
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  // Load medical items
  const loadItems = useCallback(async () => {
    try {
      const result = await trpc.getMedicalItems.query(itemFilter);
      setItems(result);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }, [itemFilter]);

  // Load procedures
  const loadProcedures = useCallback(async () => {
    try {
      const result = await trpc.getProcedures.query();
      setProcedures(result);
    } catch (error) {
      console.error('Failed to load procedures:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadItems();
    loadProcedures();
  }, [loadDashboardData, loadItems, loadProcedures]);

  // Handlers
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newItem = await trpc.createMedicalItem.mutate(newItemForm);
      setItems((prev: MedicalItem[]) => [...prev, newItem]);
      setNewItemForm({
        name: '',
        category: 'alat',
        unit: '',
        current_stock: 0,
        minimum_threshold: 0,
        purchase_price: null,
        image_path: null
      });
      setIsAddItemOpen(false);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.restockItem.mutate(restockForm);
      loadItems();
      loadDashboardData();
      setIsRestockOpen(false);
      setRestockForm({
        item_id: 0,
        quantity: 0,
        purchase_price: null,
        notes: null
      });
    } catch (error) {
      console.error('Failed to restock item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newProcedure = await trpc.createProcedure.mutate(procedureForm);
      setProcedures((prev: CircumcisionProcedure[]) => [...prev, newProcedure]);
      loadItems();
      loadDashboardData();
      setIsProcedureOpen(false);
      setProcedureForm({
        patient_name: null,
        procedure_date: new Date(),
        notes: null,
        items_used: []
      });
    } catch (error) {
      console.error('Failed to create procedure:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (item: MedicalItem): StockStatus => {
    if (item.current_stock === 0) return 'kosong';
    if (item.current_stock <= item.minimum_threshold) return 'hampir_habis';
    return 'cukup';
  };

  const getStockBadgeColor = (status: StockStatus) => {
    switch (status) {
      case 'kosong': return 'destructive';
      case 'hampir_habis': return 'secondary';
      case 'cukup': return 'default';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: ItemCategory) => {
    switch (category) {
      case 'alat': return '🔧';
      case 'obat': return '💊';
      case 'habis_pakai': return '🧼';
      default: return '📦';
    }
  };

  const addItemToProcedure = (itemId: number) => {
    const existingIndex = procedureForm.items_used.findIndex(item => item.item_id === itemId);
    if (existingIndex >= 0) {
      const updatedItems = [...procedureForm.items_used];
      updatedItems[existingIndex].quantity_used += 1;
      setProcedureForm(prev => ({ ...prev, items_used: updatedItems }));
    } else {
      setProcedureForm(prev => ({
        ...prev,
        items_used: [...prev.items_used, { item_id: itemId, quantity_used: 1 }]
      }));
    }
  };

  const removeItemFromProcedure = (itemId: number) => {
    setProcedureForm(prev => ({
      ...prev,
      items_used: prev.items_used.filter(item => item.item_id !== itemId)
    }));
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !itemFilter.category || item.category === itemFilter.category;
    const matchesStatus = !itemFilter.status || getStockStatus(item) === itemFilter.status;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🏥 SunatStock</h1>
              <p className="text-blue-100">Kelola Stok Medis Anda</p>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Hari Ini</div>
              <div className="text-lg font-semibold">{new Date().toLocaleDateString('id-ID')}</div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="p-4 bg-orange-50 border-b">
            <Alert className="border-orange-200">
              <span className="text-orange-600">⚠️</span>
              <AlertDescription className="text-orange-800">
                <strong>{lowStockItems.length} item</strong> stok hampir habis!
                <div className="mt-1 text-sm">
                  {lowStockItems.slice(0, 2).map(item => (
                    <div key={item.id}>{item.name} ({item.current_stock} {item.unit})</div>
                  ))}
                  {lowStockItems.length > 2 && (
                    <div>...dan {lowStockItems.length - 2} item lainnya</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-50">
            <TabsTrigger value="dashboard" className="text-xs">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">📦 Stok</TabsTrigger>
            <TabsTrigger value="procedures" className="text-xs">✂️ Khitan</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">📈 Laporan</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.total_items}</div>
                  <p className="text-xs text-blue-100">Semua barang</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Stok Kritis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.critical_items}</div>
                  <p className="text-xs text-red-100">Perlu restok</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Khitan Hari Ini</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.procedures_today}</div>
                  <p className="text-xs text-green-100">Prosedur</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bulan Ini</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.total_procedures_this_month}</div>
                  <p className="text-xs text-purple-100">Total khitan</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Dialog open={isProcedureOpen} onOpenChange={setIsProcedureOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                    ✂️ Catat Prosedur Khitan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Prosedur Khitan Baru</DialogTitle>
                    <DialogDescription>
                      Catat penggunaan alat dan bahan untuk pasien
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProcedure}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="patient_name">Nama Pasien (Opsional)</Label>
                        <Input
                          id="patient_name"
                          value={procedureForm.patient_name || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProcedureForm(prev => ({ ...prev, patient_name: e.target.value || null }))
                          }
                          placeholder="Masukkan nama pasien"
                        />
                      </div>
                      <div>
                        <Label htmlFor="procedure_date">Tanggal Tindakan</Label>
                        <Input
                          id="procedure_date"
                          type="date"
                          value={procedureForm.procedure_date.toISOString().split('T')[0]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProcedureForm(prev => ({ ...prev, procedure_date: new Date(e.target.value) }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label>Item yang Digunakan</Label>
                        <ScrollArea className="h-32 w-full border rounded-md p-2">
                          {items.map((item: MedicalItem) => (
                            <div key={item.id} className="flex items-center justify-between py-1">
                              <span className="text-sm">{getCategoryIcon(item.category)} {item.name}</span>
                              <div className="flex items-center gap-1">
                                {procedureForm.items_used.find(used => used.item_id === item.id) ? (
                                  <>
                                    <span className="text-xs bg-green-100 px-2 py-1 rounded">
                                      {procedureForm.items_used.find(used => used.item_id === item.id)?.quantity_used}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => removeItemFromProcedure(item.id)}
                                    >
                                      ❌
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addItemToProcedure(item.id)}
                                  >
                                    ➕
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                      <div>
                        <Label htmlFor="notes">Catatan</Label>
                        <Textarea
                          id="notes"
                          value={procedureForm.notes || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setProcedureForm(prev => ({ ...prev, notes: e.target.value || null }))
                          }
                          placeholder="Catatan tambahan..."
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Menyimpan...' : 'Simpan Prosedur'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    ➕ Tambah Item Baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Tambah Item Medis</DialogTitle>
                    <DialogDescription>
                      Tambah alat, obat, atau bahan habis pakai baru
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddItem}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nama Item</Label>
                        <Input
                          id="name"
                          value={newItemForm.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewItemForm(prev => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Klamp ukuran 20"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Kategori</Label>
                        <Select
                          value={newItemForm.category}
                          onValueChange={(value: ItemCategory) =>
                            setNewItemForm(prev => ({ ...prev, category: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alat">🔧 Alat</SelectItem>
                            <SelectItem value="obat">💊 Obat</SelectItem>
                            <SelectItem value="habis_pakai">🧼 Habis Pakai</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="unit">Satuan</Label>
                          <Input
                            id="unit"
                            value={newItemForm.unit}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setNewItemForm(prev => ({ ...prev, unit: e.target.value }))
                            }
                            placeholder="pcs"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="current_stock">Stok Awal</Label>
                          <Input
                            id="current_stock"
                            type="number"
                            value={newItemForm.current_stock}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setNewItemForm(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))
                            }
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="minimum_threshold">Batas Minimum</Label>
                          <Input
                            id="minimum_threshold"
                            type="number"
                            value={newItemForm.minimum_threshold}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setNewItemForm(prev => ({ ...prev, minimum_threshold: parseInt(e.target.value) || 0 }))
                            }
                            min="0"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="purchase_price">Harga Beli</Label>
                          <Input
                            id="purchase_price"
                            type="number"
                            value={newItemForm.purchase_price || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setNewItemForm(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) || null }))
                            }
                            placeholder="Rp"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Menambah...' : 'Tambah Item'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="p-4 space-y-4">
            {/* Search and Filter */}
            <div className="space-y-2">
              <Input
                placeholder="🔍 Cari item..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-2">
                <Select
                  value={itemFilter.category || 'all'}
                  onValueChange={(value: string) =>
                    setItemFilter(prev => ({
                      ...prev,
                      category: value === 'all' ? undefined : value as ItemCategory
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="alat">🔧 Alat</SelectItem>
                    <SelectItem value="obat">💊 Obat</SelectItem>
                    <SelectItem value="habis_pakai">🧼 Habis Pakai</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={itemFilter.status || 'all'}
                  onValueChange={(value: string) =>
                    setItemFilter(prev => ({
                      ...prev,
                      status: value === 'all' ? undefined : value as StockStatus
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="cukup">✅ Cukup</SelectItem>
                    <SelectItem value="hampir_habis">⚠️ Hampir Habis</SelectItem>
                    <SelectItem value="kosong">❌ Kosong</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredItems.map((item: MedicalItem) => {
                  const status = getStockStatus(item);
                  return (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryIcon(item.category)}</span>
                            <div>
                              <h3 className="font-medium text-sm">{item.name}</h3>
                              <p className="text-xs text-gray-600">{item.unit}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{item.current_stock}</div>
                          <Badge variant={getStockBadgeColor(status)} className="text-xs">
                            {status === 'cukup' ? '✅ Cukup' : 
                             status === 'hampir_habis' ? '⚠️ Hampir Habis' : 
                             '❌ Kosong'}
                          </Badge>
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Min: {item.minimum_threshold} | 
                          {item.purchase_price ? ` Rp ${item.purchase_price.toLocaleString('id-ID')}` : ' Harga: -'}
                        </span>
                        <Dialog open={isRestockOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                          setIsRestockOpen(open);
                          if (open) {
                            setSelectedItem(item);
                            setRestockForm(prev => ({ ...prev, item_id: item.id }));
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              📦 Restok
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Restok Item</DialogTitle>
                              <DialogDescription>
                                Tambah stok untuk {selectedItem?.name || 'item'}
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleRestock}>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="quantity">Jumlah Tambahan</Label>
                                  <Input
                                    id="quantity"
                                    type="number"
                                    value={restockForm.quantity}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setRestockForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                                    }
                                    min="1"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="restock_price">Harga Beli (per item)</Label>
                                  <Input
                                    id="restock_price"
                                    type="number"
                                    value={restockForm.purchase_price || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      setRestockForm(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) || null }))
                                    }
                                    placeholder="Rp"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="restock_notes">Catatan</Label>
                                  <Textarea
                                    id="restock_notes"
                                    value={restockForm.notes || ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                      setRestockForm(prev => ({ ...prev, notes: e.target.value || null }))
                                    }
                                    placeholder="Catatan pembelian..."
                                  />
                                </div>
                              </div>
                              <DialogFooter className="mt-4">
                                <Button type="submit" disabled={isLoading}>
                                  {isLoading ? 'Menyimpan...' : 'Tambah Stok'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Procedures Tab */}
          <TabsContent value="procedures" className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Riwayat Khitan</h2>
              <Dialog open={isProcedureOpen} onOpenChange={setIsProcedureOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">✂️ Prosedur Baru</Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {procedures.map((procedure: CircumcisionProcedure) => (
                  <Card key={procedure.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {procedure.patient_name ? `Pasien: ${procedure.patient_name}` : 'Pasien (Anonim)'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          📅 {procedure.procedure_date.toLocaleDateString('id-ID')}
                        </p>
                        {procedure.notes && (
                          <p className="text-sm text-gray-500 mt-1">{procedure.notes}</p>
                        )}
                      </div>
                      <Badge variant="outline">#{procedure.id}</Badge>
                    </div>
                  </Card>
                ))}
                {procedures.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">✂️</div>
                    <p>Belum ada prosedur khitan</p>
                    <p className="text-sm">Catat prosedur pertama Anda!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="p-4 space-y-4">
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📈</div>
              <p className="font-medium">Laporan & Analitik</p>
              <p className="text-sm">Fitur laporan akan tersedia segera</p>
              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full" disabled>
                  📊 Laporan Penggunaan Bulanan
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  📉 Trend Stok
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  💰 Analisis Biaya
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
