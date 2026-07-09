import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { supabase } from "../../services/supabase";

const emptyForm = (defaultType) => ({
  type: defaultType || "expense",
  category: "",
  account: "",
  amount: "",
  current_value: "",
  description: "",
  transaction_date: new Date().toISOString().split("T")[0],
});

const formFromTransaction = (t) => ({
  type: t.type,
  category: t.category || "",
  account: t.account || "",
  amount: t.amount ?? "",
  current_value: t.current_value ?? "",
  description: t.description || "",
  transaction_date: t.transaction_date || new Date().toISOString().split("T")[0],
});

export default function AddTransactionDialog({ isOpen, onClose, onSubmit, defaultType, editTransaction }) {
  const isEditing = !!editTransaction
  const [formData, setFormData] = useState(emptyForm(defaultType));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData(isEditing ? formFromTransaction(editTransaction) : emptyForm(defaultType));
      setError("");
    }
  }, [isOpen, defaultType, editTransaction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("User not authenticated");
      }

      const currentValue =
        formData.type === "investment" && formData.current_value !== ""
          ? parseFloat(formData.current_value)
          : formData.type === "investment"
          ? parseFloat(formData.amount)
          : null;

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            type: formData.type,
            category: formData.category,
            account: formData.account,
            amount: parseFloat(formData.amount),
            description: formData.description,
            transaction_date: formData.transaction_date,
            current_value: currentValue,
          })
          .eq("id", editTransaction.id);
        if (updateError) throw updateError;
      } else {
        const payload = {
          user_id: session.user.id,
          type: formData.type,
          category: formData.category,
          account: formData.account,
          amount: parseFloat(formData.amount),
          description: formData.description,
          transaction_date: formData.transaction_date,
          current_value: currentValue,
        };
        const { error: insertError } = await supabase.from("transactions").insert([payload]);
        if (insertError) throw insertError;
      }

      onSubmit(formData);
      setFormData(emptyForm(defaultType));
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
    };

  const handleClose = () => {
    if (!loading) {
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <FormControl fullWidth disabled={loading}>
          <InputLabel>Type</InputLabel>
          <Select name="type" value={formData.type} onChange={handleChange} label="Type">
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="investment">Investment</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder={
            formData.type === "investment" ? "e.g., Mutual Funds, Stocks" : "e.g., Groceries, Salary"
          }
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Account"
          name="account"
          value={formData.account}
          onChange={handleChange}
          placeholder="e.g., Checking, Cash"
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label={formData.type === "investment" ? "Amount invested" : "Amount"}
          name="amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          inputProps={{ step: "0.01" }}
          disabled={loading}
          required
        />

        {formData.type === "investment" && (
          <TextField
            fullWidth
            label="Current value (optional)"
            name="current_value"
            type="number"
            value={formData.current_value}
            onChange={handleChange}
            placeholder="Defaults to amount invested"
            inputProps={{ step: "0.01" }}
            disabled={loading}
          />
        )}

        <TextField
          fullWidth
          label="Date"
          name="transaction_date"
          type="date"
          value={formData.transaction_date}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional notes"
          multiline
          rows={3}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Transaction"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}