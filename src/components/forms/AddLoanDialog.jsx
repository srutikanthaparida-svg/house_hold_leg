import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { supabase } from "../../services/supabase";

const emptyForm = () => ({
  lender: "",
  principal_amount: "",
  interest_rate: "",
  tenure_years: "",
  start_date: new Date().toISOString().split("T")[0],
  account: "",
  actual_emi_amount: "",
});

const formFromLoan = (loan) => ({
  lender: loan.lender || "",
  principal_amount: loan.principal_amount ?? "",
  interest_rate: loan.interest_rate ?? "",
  tenure_years: loan.tenure_months ? (loan.tenure_months / 12).toString() : "",
  start_date: loan.start_date || new Date().toISOString().split("T")[0],
  account: loan.account || "",
  actual_emi_amount: loan.actual_emi_amount ?? "",
});

export default function AddLoanDialog({ isOpen, onClose, onSubmit, editLoan }) {
  const isEditing = !!editLoan
  const [formData, setFormData] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData(isEditing ? formFromLoan(editLoan) : emptyForm());
      setError("");
    }
  }, [isOpen, editLoan]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      const tenureMonths = Math.round(parseFloat(formData.tenure_years) * 12);

      const basePayload = {
        lender: formData.lender,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: parseFloat(formData.interest_rate),
        tenure_months: tenureMonths,
        start_date: formData.start_date,
        account: formData.account || null,
        actual_emi_amount: formData.actual_emi_amount ? parseFloat(formData.actual_emi_amount) : null,
      };

      if (isEditing) {
        const { error: updateError } = await supabase.from("loans").update(basePayload).eq("id", editLoan.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("loans")
          .insert([{ ...basePayload, user_id: session.user.id }]);
        if (insertError) throw insertError;
      }

      onSubmit(formData);
      setFormData(emptyForm());
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save loan");
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
      <DialogTitle>{isEditing ? "Edit Loan" : "Add Loan"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          fullWidth
          label="Lender / Loan name"
          name="lender"
          value={formData.lender}
          onChange={handleChange}
          placeholder="e.g., HDFC Home Loan"
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Principal amount (₹)"
          name="principal_amount"
          type="number"
          value={formData.principal_amount}
          onChange={handleChange}
          placeholder="0.00"
          inputProps={{ step: "0.01" }}
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Annual interest rate (%)"
          name="interest_rate"
          type="number"
          value={formData.interest_rate}
          onChange={handleChange}
          placeholder="e.g., 8.5"
          inputProps={{ step: "0.01" }}
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Tenure (years)"
          name="tenure_years"
          type="number"
          value={formData.tenure_years}
          onChange={handleChange}
          placeholder="e.g., 20"
          inputProps={{ step: "0.5" }}
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Start date"
          name="start_date"
          type="date"
          value={formData.start_date}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Account (optional)"
          name="account"
          value={formData.account}
          onChange={handleChange}
          placeholder="e.g., HDFC Bank"
          disabled={loading}
        />

        <TextField
          fullWidth
          label="Actual monthly payment (₹, optional)"
          name="actual_emi_amount"
          type="number"
          value={formData.actual_emi_amount}
          onChange={handleChange}
          placeholder="Leave blank to use the calculated EMI"
          helperText="If you're paying more or less than the standard EMI, enter the real amount here to see its impact."
          inputProps={{ step: "0.01" }}
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
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Loan"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}