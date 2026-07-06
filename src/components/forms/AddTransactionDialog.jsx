import { useState } from "react";
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

export default function AddTransactionDialog({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    type: "expense",
    category: "",
    account: "",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("User not authenticated");
      }

      const { error: insertError } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: session.user.id,
            type: formData.type,
            category: formData.category,
            account: formData.account,
            amount: parseFloat(formData.amount),
            description: formData.description,
            transaction_date: formData.transaction_date,
          },
        ]);

      if (insertError) throw insertError;

      onSubmit(formData);
      setFormData({
        type: "expense",
        category: "",
        account: "",
        amount: "",
        description: "",
        transaction_date: new Date().toISOString().split("T")[0],
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add transaction");
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
      <DialogTitle>Add Transaction</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <FormControl fullWidth disabled={loading}>
          <InputLabel>Type</InputLabel>
          <Select
            name="type"
            value={formData.type}
            onChange={handleChange}
            label="Type"
          >
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g., Groceries, Salary"
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
          label="Amount"
          name="amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          inputProps={{ step: "0.01" }}
          disabled={loading}
          required
        />

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
          {loading ? "Adding..." : "Add Transaction"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

