> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §G`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Lab and imaging orders — edit canonical copy in platform `Processes/`.

## G. Lab Orders Workflow


### G1. Lab & Imaging Orders

**Pages:** `CompleteLabOrders.tsx` (modal)
**API:** `POST /api/lab-orders`
**Tables:** `lab_orders`

```text
Process:
1. Doctor opens lab orders modal
2. Tab 1: Order Tests
   - Search test catalog
   - Select tests (CBC, metabolic, imaging, etc.)
   - Set priority (normal/urgent/stat)
   - Add clinical indication
3. Submit → INSERT lab_orders (status: 'ordered')
4. Tab 2: View Results (when available)
   - Results with normal ranges
   - Flag indicators (H = high, L = low, C = critical)
   - AI analysis interpretation
5. Doctor uploads results manually or via integration
6. UPDATE lab_orders SET results = JSONB
7. Notification → patient ("Lab results ready")
```


## Features


- Test catalog search


- Priority levels


- Normal range display


- Flag indicators (H/L/C)


- AI interpretation

---
