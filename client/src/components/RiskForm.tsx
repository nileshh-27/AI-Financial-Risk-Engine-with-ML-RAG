import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { riskInputSchema, type RiskInput } from "@shared/schema";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskFormProps {
  onSubmit: (data: RiskInput) => void;
  isLoading: boolean;
}

export function RiskForm({ onSubmit, isLoading }: RiskFormProps) {
  const form = useForm<RiskInput>({
    resolver: zodResolver(riskInputSchema),
    defaultValues: {
      transactionAmount: 0,
      merchantCategory: "Retail",
      merchantName: "",
      paymentDescription: "",
      paymentFrequency: "one-time",
      isSubscription: false,
      isInternational: false,
      previousChargebacks: 0,
    },
  });

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          New Assessment
        </CardTitle>
        <CardDescription>Enter transaction details to calculate risk score.</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="transactionAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        className="bg-black/20 border-white/10"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="merchantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant / Shop Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Surya Kirana Store"
                        className="bg-black/20 border-white/10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="merchantCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Groceries">Groceries</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Subscriptions">Subscriptions</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Transport">Transport</SelectItem>
                        <SelectItem value="EMI/Loan">EMI/Loan</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Investment">Investment</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Digital Goods">Digital Goods</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Gambling">Gambling</SelectItem>
                        <SelectItem value="Jewelry">Jewelry</SelectItem>
                        <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one-time">One-time</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi-annual">Semi-annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Truecaller annual subscription renewal"
                      className="bg-black/20 border-white/10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="previousChargebacks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous Chargebacks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-black/20 border-white/10"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3 mt-1">
                <FormField
                  control={form.control}
                  name="isInternational"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 border border-white/5 rounded-md bg-black/10">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-white/20 data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer text-sm">International Transaction</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isSubscription"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 border border-white/5 rounded-md bg-black/10">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          className="border-white/20 data-[state=checked]:bg-purple-500"
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer text-sm">Recurring Subscription</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="mt-auto pt-4">
              <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Risk...
                  </>
                ) : (
                  "Run Risk Analysis"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
