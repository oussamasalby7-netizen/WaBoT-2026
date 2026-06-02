import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Search, MoreVertical, X } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "../hooks/useProducts";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import Dialog from "../components/ui/Dialog";
import Input from "../components/ui/Input";
import { useI18n } from "../context/I18nContext.jsx";
import "../styles/products.css";

const emptyProductForm = { name: "", description: "", price: "", stock: "" };

export default function Products() {
  const { t } = useI18n();
  const {
    products, isLoading,
    createProduct, isCreating,
    updateProduct, isUpdating,
    deleteProduct, isDeleting,
  } = useProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, productId: null, productName: "" });
  const [productDialog, setProductDialog] = useState({
    open: false, mode: "create", productId: null, form: emptyProductForm,
  });

  const openCreateDialog = () =>
    setProductDialog({ open: true, mode: "create", productId: null, form: emptyProductForm });

  const openEditDialog = (product) =>
    setProductDialog({
      open: true, mode: "edit", productId: product.id,
      form: { name: product.name, description: product.description, price: String(product.price), stock: String(product.stock) },
    });

  const closeProductDialog = () =>
    setProductDialog({ open: false, mode: "create", productId: null, form: emptyProductForm });

  const updateProductForm = (field, value) =>
    setProductDialog((d) => ({ ...d, form: { ...d.form, [field]: value } }));

  const saveProduct = async (e) => {
    e.preventDefault();
    const { form } = productDialog;
    if (!form.name.trim()) return toast.error(t("products.nameRequired"));
    if (form.price === "" || Number(form.price) < 0) return toast.error(t("products.priceRequired"));
    if (form.stock === "" || Number(form.stock) < 0) return toast.error(t("products.stockRequired"));
    const payload = { name: form.name.trim(), description: form.description.trim(), price: Number(form.price), stock: Number(form.stock) };
    try {
      if (productDialog.mode === "edit") {
        await updateProduct({ id: productDialog.productId, data: payload });
      } else {
        await createProduct(payload);
      }
      closeProductDialog();
    } catch { /* handled by hook */ }
  };

  const handleDeleteClick = (product) =>
    setDeleteDialog({ open: true, productId: product.id, productName: product.name });

  const confirmDelete = async () => {
    try {
      await deleteProduct(deleteDialog.productId);
      setDeleteDialog({ open: false, productId: null, productName: "" });
    } catch { /* handled by hook */ }
  };

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="products-page">
      {/* PAGE HEADER */}
      <div className="products-header">
        <div className="products-header-text">
          <h2>{t("products.title")}</h2>
          <p>{t("products.subtitle")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="btn-icon" />
          {t("products.addProduct")}
        </Button>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="products-toolbar">
        <div className="products-search">
          <Search className="products-search-icon" />
          <input
            type="text"
            placeholder={t("products.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="products-search-input"
          />
        </div>
        <div className="products-toolbar-divider" />
        <div className="products-count">
          Total: <strong>{filteredProducts?.length ?? 0}</strong>
        </div>
      </div>

      {/* GRID / STATES */}
      {isLoading ? (
        <div className="products-skeleton-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} style={{ height: "280px", borderRadius: "var(--radius-xl)" }} />
          ))}
        </div>
      ) : !filteredProducts || filteredProducts.length === 0 ? (
        <div className="products-empty">
          <div className="products-empty-icon">
            <Package size={32} />
          </div>
          <h3>{t("products.noProducts")}</h3>
          <p>{t("products.noProductsSubtitle")}</p>
        </div>
      ) : (
        <div className="products-grid">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25 }}
                className="product-card"
              >
                {/* IMAGE AREA */}
                <div className="product-image-area">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="product-image" />
                  ) : (
                    <Package size={56} className="product-placeholder-icon" />
                  )}

                  {/* Stock badge top-right */}
                  <div className="product-stock-badge">
                    <Badge variant={product.stock > 0 ? "success" : "danger"}>
                      {product.stock > 0 ? `${t("products.inStock")} (${product.stock})` : t("products.outOfStock")}
                    </Badge>
                  </div>

                  {/* Hover actions overlay */}
                  <div className="product-hover-actions">
                    <Button
                      variant="secondary"
                      onClick={() => openEditDialog(product)}
                      style={{ padding: "6px 14px", fontSize: "12px" }}
                    >
                      {t("products.editProduct")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteClick(product)}
                      style={{ padding: "6px 14px", fontSize: "12px" }}
                    >
                      {t("products.deleteProduct")}
                    </Button>
                  </div>
                </div>

                {/* INFO */}
                <div className="product-info">
                  <div className="product-name-row">
                    <span className="product-name">{product.name}</span>
                    <button
                      type="button"
                      onClick={() => openEditDialog(product)}
                      className="product-menu-btn"
                      aria-label={`Edit ${product.name}`}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <p className="product-description">
                    {product.description || "No description provided."}
                  </p>
                  <div className="product-price-row">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <div className="product-pulse" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      <AnimatePresence>
        {productDialog.open && (
          <div className="product-modal-overlay">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProductDialog}
              className="product-modal-backdrop"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onSubmit={saveProduct}
              className="product-modal-card"
            >
              <button
                type="button"
                onClick={closeProductDialog}
                className="product-modal-close"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <h3 className="product-modal-title">
                {productDialog.mode === "edit" ? t("products.editProduct") : t("products.addProduct")}
              </h3>
              <p className="product-modal-subtitle">
                {t("products.changesSavedDesc")}
              </p>

              <div className="product-modal-form">
                <Input
                  label={t("products.nameLabel")}
                  value={productDialog.form.name}
                  onChange={(e) => updateProductForm("name", e.target.value)}
                  required
                />
                <Input
                  label={t("settings.description")}
                  value={productDialog.form.description}
                  onChange={(e) => updateProductForm("description", e.target.value)}
                />
                <div className="product-form-row">
                  <Input
                    label={t("products.priceLabel")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={productDialog.form.price}
                    onChange={(e) => updateProductForm("price", e.target.value)}
                    required
                  />
                  <Input
                    label={t("products.stockLabel")}
                    type="number"
                    min="0"
                    step="1"
                    value={productDialog.form.stock}
                    onChange={(e) => updateProductForm("stock", e.target.value)}
                    required
                  />
                </div>

                <div className="product-modal-actions">
                  <Button type="button" variant="secondary" onClick={closeProductDialog}>
                    {t("settings.cancel")}
                  </Button>
                  <Button type="submit" isLoading={isCreating || isUpdating}>
                    {productDialog.mode === "edit" ? t("products.saveProduct") : t("products.addProduct")}
                  </Button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, productId: null, productName: "" })}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="danger"
        title={t("products.deleteProduct")}
        description={t("products.deleteConfirmDesc")}
        confirmText={t("products.deleteProduct")}
      />
    </div>
  );
}
