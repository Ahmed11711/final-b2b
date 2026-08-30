import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableComponent from "../../components/components/BaseComponents/TableComponent";
import DynamicForm from "../../components/components/BaseComponents/DynamicForm";
import { createItem, deleteItem, getAll } from "../../service/services/apiService";
import { buildPayloadByEndpoint } from "../../utils/payloadBuilders";
import { bagItemsEndpoint, bagItemsFields, bagItemsTitle } from "./config";
import { useTranslation } from "../../hooks/useTranslation";

export default function Bag_itemsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);

  // ✅ كل الفئات (فيها bag_id) + الحقائب + الحقيبة المختارة حاليًا في فورم الإضافة
  const [allCategories, setAllCategories] = useState([]);
  const [bags, setBags] = useState([]);
  const [selectedBagId, setSelectedBagId] = useState(null);

  const { t } = useTranslation();

  useEffect(() => {
    // ✅ نجيب الفئات كاملة (مع bag_id) عشان نقدر نفلتر بيها لاحقًا
    getAll("bags_categories", { per_page: 200 })
      .then((res) => {
        const list = res.data || (Array.isArray(res) ? res : []);
        setAllCategories(list);
      })
      .catch(() => setAllCategories([]));

    getAll("bags", { per_page: 100 })
      .then((res) => {
        const list = res.data || (Array.isArray(res) ? res : []);
        setBags(list.map((b) => ({ label: b.title, value: b.id })));
      })
      .catch(() => setBags([]));
  }, []);

  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const rawParams = { page, search: searchTerm, ...activeFilters };
      const cleanParams = Object.fromEntries(Object.entries(rawParams).filter(([, v]) => v !== "" && v != null));
      const response = await getAll(bagItemsEndpoint, cleanParams);
      const fetched = response.data || (Array.isArray(response) ? response : []);

      const enriched = fetched.map((row) => ({
        ...row,
        category_title: row.bagsCategories?.title || "-",
        bag_title: row.bagsCategories?.bag?.title || "-",
      }));

      setData(enriched);
      setMeta({
        current_page: parseInt(response.meta?.current_page || page, 10),
        last_page: parseInt(response.meta?.last_page || 1, 10),
        total: parseInt(response.meta?.total || fetched.length, 10),
        per_page: parseInt(response.meta?.per_page || 10, 10),
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, JSON.stringify(activeFilters)]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(1), 350);
    return () => clearTimeout(timer);
  }, [loadData]);

  // ✅ الفئات اللي تخص الحقيبة المختارة بس (فورم الإضافة)
  const filteredCategoryOptions = useMemo(() => {
    if (!selectedBagId) return [];
    return allCategories
      .filter((c) => Number(c.bag_id) === Number(selectedBagId))
      .map((c) => ({ label: c.title, value: c.id }));
  }, [allCategories, selectedBagId]);

  // ✅ كل الفئات (للفلتر اللي فوق الجدول، لسه شغال زي ما هو)
  const allCategoryOptionsForFilter = useMemo(
    () => allCategories.map((c) => ({ label: c.title, value: c.id })),
    [allCategories]
  );

  const handleCreate = async (formData) => {
    try {
      const { bag_id, ...rest } = formData; // bag_id حقل مساعد بس مش بيتبعت للـ backend
      const payload = buildPayloadByEndpoint(bagItemsEndpoint, rest);
      await createItem(bagItemsEndpoint, payload);
      setShowCreate(false);
      setSelectedBagId(null);
      loadData(1);
      return { success: true };
    } catch (error) {
      return { success: false, errors: error.response?.data?.errors || {} };
    }
  };

  const handleDelete = async () => {
    if (!deleteRow?.id) return;
    await deleteItem(bagItemsEndpoint, deleteRow.id);
    setDeleteRow(null);
    loadData(meta.current_page);
  };

  // ✅ حقول فورم الإضافة: bag_id ياخد كل الحقائب، bags_categories_id ياخد الفئات المفلترة بس
  const visibleFields = bagItemsFields
    .filter((f) => f.form_show !== false && !["id", "created_at", "updated_at"].includes(f.key))
    .map((f) => {
      if (f.key === "bag_id") return { ...f, options: bags };
      if (f.key === "bags_categories_id") {
        return {
          ...f,
          options: filteredCategoryOptions,
          disabled: !selectedBagId,
          placeholder: selectedBagId ? "اختر الفئة" : "اختر الحقيبة أولاً",
        };
      }
      return f;
    });

  // ✅ حقول الجدول (الفلتر اللي فوق الجدول) - بيفضل يعرض كل الفئات وكل الحقائب من غير فلترة
  const headersWithOptions = bagItemsFields.map((f) => {
    if (f.key === "bags_categories_id") return { ...f, options: allCategoryOptionsForFilter };
    if (f.key === "bag_id") return { ...f, options: bags };
    return f;
  });

  // ✅ لما المستخدم يغيّر الحقيبة جوه فورم الإضافة، نفلتر الفئات
  const handleFieldChange = (key, value) => {
    if (key === "bag_id") {
      setSelectedBagId(value);
    }
  };

  return (
    <div className="page-container antialiased pb-20 bg-[#fbfcfd] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-heading-slate">{bagItemsTitle}</h1>
          <button onClick={() => setShowCreate(true)} className="btn-emerald px-6 py-3 rounded-2xl">{t("Add New Bag Item")}</button>
        </div>
        <div className="relative">
          {loading && <div className="absolute inset-0 z-10 bg-white/50" />}
          <TableComponent
            headers={headersWithOptions}
            data={data}
            meta={meta}
            onPageChange={(p) => loadData(p)}
            onSearchChange={setSearchTerm}
            onFilterChange={(k, v) => setActiveFilters((prev) => ({ ...prev, [k]: v }))}
            onEdit={(row) => navigate(`/bag_items/edit/${row.id}`)}
            onView={(row) => navigate(`/bag_items/view/${row.id}`)}
            onDelete={(row) => setDeleteRow(row)}
          />
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 relative">
            <button
              onClick={() => {
                setShowCreate(false);
                setSelectedBagId(null);
              }}
              className="absolute right-6 top-6 text-slate-500"
            >
              ✕
            </button>
            <DynamicForm
              fields={visibleFields}
              onSubmit={handleCreate}
              onFieldChange={handleFieldChange}
              title={t("pages.bag_items.add_new")}
            />
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <p className="text-sm text-slate-700 mb-4">{t("Delete Bag Item")} "{deleteRow.title || deleteRow.id}"?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteRow(null)} className="btn-outline-gray px-4 py-2 rounded-xl">{t("Cancel")}</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-red-600 text-white">{t("Delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}