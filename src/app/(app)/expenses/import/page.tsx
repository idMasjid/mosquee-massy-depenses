import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { ImportExpensesForm } from "@/components/expenses/import-expenses-form";

export default async function ImportExpensesPage() {
  await requireRole(["ADMIN", "IT"]);

  const [projects, suppliers, paymentTypes, purchaseTypes] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true },
      include: { allowedRubriques: { orderBy: { rubrique: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.paymentType.findMany({ orderBy: { name: "asc" } }),
    prisma.purchaseType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importer des dépenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fichier Excel (.xlsx) ou CSV, mêmes colonnes que le suivi habituel (Date saisie, Projet, Catégorie, Titre
          produit, Fournisseur, Montant TTC obligatoires ; les autres colonnes sont facultatives). Le couple
          Projet/Catégorie et le Fournisseur doivent correspondre à des valeurs existantes (gérées dans
          Paramétrage), sinon la ligne est rejetée ; Type paiement et Type d&apos;achat, s&apos;ils sont renseignés,
          sont contrôlés de la même façon. Les lignes importées prennent le statut « Import à valider » et ne
          comptent pas dans les totaux tant qu&apos;elles n&apos;ont pas été relues et basculées vers un autre statut.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Projets et catégories valides</h2>
        {projects.length === 0 ? (
          <p className="text-sm">Aucun projet actif pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {projects.map((p) => (
              <li key={p.id} className="text-sm">
                <span className="font-medium">{p.name}</span>
                {" — "}
                <span className="text-muted-foreground">
                  {p.allowedRubriques.length > 0
                    ? p.allowedRubriques.map((r) => r.rubrique).join(", ")
                    : "aucune catégorie configurée"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Fournisseurs, types paiement et types d&apos;achat valides</h2>
        <div className="flex flex-col gap-1.5 text-sm">
          <p>
            <span className="font-medium">Fournisseurs</span>
            {" — "}
            <span className="text-muted-foreground">
              {suppliers.length > 0 ? suppliers.map((s) => s.name).join(", ") : "aucun fournisseur configuré"}
            </span>
          </p>
          <p>
            <span className="font-medium">Types de paiement</span>
            {" — "}
            <span className="text-muted-foreground">
              {paymentTypes.length > 0 ? paymentTypes.map((p) => p.name).join(", ") : "aucun type configuré"}
            </span>
          </p>
          <p>
            <span className="font-medium">Types d&apos;achat</span>
            {" — "}
            <span className="text-muted-foreground">
              {purchaseTypes.length > 0 ? purchaseTypes.map((p) => p.name).join(", ") : "aucun type configuré"}
            </span>
          </p>
        </div>
      </div>

      <ImportExpensesForm />
    </div>
  );
}
