import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { updateProfileSchema, type UserProfile } from "@tiendadcc/utils";
import { FavoriteProductCard } from "../components/FavoriteProductCard.tsx";
import { Header } from "../components/Header.tsx";
import { TextField } from "../components/TextField.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { formatPriceCLP } from "../logic/cartCalculations.ts";
import { issuesToFieldErrors } from "../logic/formErrors.ts";
import { getProductById } from "../logic/productLookup.ts";
import { parseProducts, type Product } from "../logic/productParse.ts";
import {
  FAVORITES_PAGE_SIZE,
  formatViewedAt,
  HISTORY_PAGE_SIZE,
  paginate,
} from "../logic/profilePagination.ts";
import {
  fetchProfile,
  removeFavorite,
  updateProfile,
} from "../logic/profileApi.ts";
import productsJson from "../data/products.json";

const productCatalog = parseProducts(productsJson);

const EDIT_FIELD_ORDER = [
  "username",
  "displayName",
  "email",
  "currentPassword",
] as const;

interface EditValues {
  username: string;
  displayName: string;
  email: string;
  currentPassword: string;
}

function valuesFromProfile(profile: UserProfile): EditValues {
  return {
    username: profile.username,
    displayName: profile.displayName,
    email: profile.email,
    currentPassword: "",
  };
}

// Vista de perfil (spec 006, RF-8/RF-9): modo lectura con datos, estado,
// favoritos, historial paginado y resumen del carrito; modo edición con
// confirmación por contraseña actual. Lógica de API en profileApi.ts (§3).
export function ProfilePage() {
  const { refresh } = useAuth();
  const { totalCount, totalAmount, openCart } = useCart();
  const location = useLocation();
  const requestedSection =
    (location.state as { section?: unknown } | null)?.section === "favoritos"
      ? "favoritos"
      : null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [values, setValues] = useState<EditValues>({
    username: "",
    displayName: "",
    email: "",
    currentPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [favoritesPage, setFavoritesPage] = useState<number>(1);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState<number>(
    HISTORY_PAGE_SIZE,
  );
  const [favoritePending, setFavoritePending] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const favoritesSectionRef = useRef<HTMLDivElement>(null);

  async function loadProfile(): Promise<void> {
    setLoading(true);
    setLoadError(null);
    const loaded = await fetchProfile();
    if (loaded === null) {
      setLoadError(
        "No se pudo cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.",
      );
    } else {
      setProfile(loaded);
      setValues(valuesFromProfile(loaded));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadProfile();
    // Carga única al montar la vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formError !== null && Object.keys(fieldErrors).length === 0) {
      formErrorRef.current?.focus();
    }
  }, [formError, fieldErrors]);

  // Llegada desde el encabezado a la sección de favoritos (RF-14): desplaza
  // y mueve el foco una vez que el perfil ya cargó. Sin animación si el
  // usuario prefiere movimiento reducido.
  useEffect(() => {
    if (requestedSection !== "favoritos" || loading || profile === null) {
      return;
    }
    const section = favoritesSectionRef.current;
    if (section === null) {
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    section.scrollIntoView?.({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    section.focus({ preventScroll: true });
  }, [requestedSection, loading, profile]);

  const favoriteProducts = useMemo(
    () =>
      (profile?.favorites ?? [])
        .map((productId) => getProductById(productCatalog, productId))
        .filter((product) => product !== undefined),
    [profile],
  );

  const historyItems = useMemo(
    () =>
      (profile?.history ?? [])
        .map((visit) => {
          const product = getProductById(productCatalog, visit.productId);
          if (product === undefined) {
            return undefined;
          }
          return { product, viewedAt: visit.viewedAt };
        })
        .filter(
          (entry): entry is { product: Product; viewedAt: string } =>
            entry !== undefined,
        ),
    [profile],
  );

  const favoritesPageData = paginate(
    favoriteProducts,
    favoritesPage,
    FAVORITES_PAGE_SIZE,
  );
  const visibleHistoryItems = historyItems.slice(0, visibleHistoryCount);
  const historyListRef = useRef<HTMLUListElement>(null);
  const [canScrollHistoryLeft, setCanScrollHistoryLeft] =
    useState<boolean>(false);
  const [canScrollHistoryRight, setCanScrollHistoryRight] =
    useState<boolean>(false);

  function updateHistoryScrollEdges() {
    const list = historyListRef.current;
    if (list === null) {
      return;
    }
    setCanScrollHistoryLeft(list.scrollLeft > 0);
    setCanScrollHistoryRight(
      list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
    );
  }

  useEffect(() => {
    updateHistoryScrollEdges();
  }, [visibleHistoryItems.length]);

  // Desplaza exactamente una tarjeta para mostrarla completa, igual que el
  // gesto de desplazamiento en móvil (que sigue funcionando de forma nativa).
  function scrollHistory(direction: 1 | -1) {
    const list = historyListRef.current;
    if (list === null) {
      return;
    }
    const firstItem = list.querySelector(":scope > li");
    const step =
      (firstItem instanceof HTMLElement ? firstItem.offsetWidth : 0) + 12;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    list.scrollBy?.({
      left: direction * step,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  function handleEditChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => {
      if (previous[name] === undefined) {
        return previous;
      }
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  function focusFirstError(
    form: HTMLFormElement,
    errors: Record<string, string>,
  ) {
    for (const name of EDIT_FIELD_ORDER) {
      if (errors[name] !== undefined) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) {
          field.focus();
        }
        return;
      }
    }
  }

  function startEditing() {
    if (profile !== null) {
      setValues(valuesFromProfile(profile));
    }
    setFieldErrors({});
    setFormError(null);
    setSuccess(null);
    setMode("edit");
  }

  function cancelEditing() {
    if (profile !== null) {
      setValues(valuesFromProfile(profile));
    }
    setFieldErrors({});
    setFormError(null);
    setMode("read");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const form = event.currentTarget;
    const parsed = updateProfileSchema.safeParse(values);
    if (!parsed.success) {
      const errors = issuesToFieldErrors(parsed.error);
      setFieldErrors(errors);
      setFormError(null);
      focusFirstError(form, errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    const result = await updateProfile(parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      if (result.fieldErrors !== undefined) {
        setFieldErrors(result.fieldErrors);
        setFormError(result.message);
        focusFirstError(form, result.fieldErrors);
      } else {
        setFormError(result.message);
      }
      return;
    }

    setProfile(result.profile);
    setValues(valuesFromProfile(result.profile));
    setMode("read");
    setSuccess("Perfil actualizado correctamente.");
    await refresh();
  }

  async function handleRemoveFavorite(productId: string): Promise<void> {
    if (favoritePending !== null) {
      return;
    }
    setFavoritePending(productId);
    setFavoriteError(null);
    const result = await removeFavorite(productId);
    if (result.ok) {
      setProfile((previous) =>
        previous === null
          ? previous
          : {
              ...previous,
              favorites: previous.favorites.filter((id) => id !== productId),
            },
      );
    } else {
      setFavoriteError(result.message);
    }
    setFavoritePending(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <h1 className="font-mono text-3xl font-bold text-foreground">
          Mi perfil
        </h1>

        {success !== null && (
          <p role="status" className="text-sm text-terminal-success">
            {success}
          </p>
        )}

        {loading && (
          <p role="status" className="font-sans text-sm text-muted-foreground">
            Cargando tu perfil…
          </p>
        )}

        {!loading && loadError !== null && (
          <div className="flex flex-col gap-3">
            <p role="alert" className="font-sans text-sm text-destructive">
              {loadError}
            </p>
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => {
                void loadProfile();
              }}
            >
              Reintentar
            </Button>
          </div>
        )}

        {!loading && loadError === null && profile !== null && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="font-mono">Datos personales</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {mode === "read" ? (
                  <>
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="font-sans text-sm text-muted-foreground">
                          Nombre de usuario
                        </dt>
                        <dd className="font-mono text-base text-foreground">
                          {profile.username}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-sans text-sm text-muted-foreground">
                          Nombre a mostrar
                        </dt>
                        <dd className="font-sans text-base text-foreground">
                          {profile.displayName}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-sans text-sm text-muted-foreground">
                          Correo electrónico
                        </dt>
                        <dd className="font-sans text-base text-foreground">
                          {profile.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-sans text-sm text-muted-foreground">
                          Estado de la cuenta
                        </dt>
                        <dd>
                          <Badge
                            variant={
                              profile.emailVerified ? "default" : "secondary"
                            }
                          >
                            {profile.emailVerified
                              ? "Cuenta verificada"
                              : "Pendiente de verificación"}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                    <Button
                      type="button"
                      variant="outline"
                      className="self-start"
                      onClick={startEditing}
                    >
                      Editar perfil
                    </Button>
                  </>
                ) : (
                  <form noValidate onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField
                          label="Nombre de usuario"
                          name="username"
                          type="text"
                          autoComplete="username"
                          value={values.username}
                          onChange={handleEditChange}
                          disabled={submitting}
                          error={fieldErrors.username}
                        />
                        <TextField
                          label="Nombre a mostrar"
                          name="displayName"
                          type="text"
                          autoComplete="nickname"
                          value={values.displayName}
                          onChange={handleEditChange}
                          disabled={submitting}
                          error={fieldErrors.displayName}
                        />
                      </div>
                      <TextField
                        label="Correo electrónico"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={values.email}
                        onChange={handleEditChange}
                        disabled={submitting}
                        error={fieldErrors.email}
                      />
                      <TextField
                        label="Contraseña actual"
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        value={values.currentPassword}
                        onChange={handleEditChange}
                        disabled={submitting}
                        error={fieldErrors.currentPassword}
                      />
                      {formError !== null && (
                        <p
                          ref={formErrorRef}
                          role="alert"
                          tabIndex={-1}
                          className="text-sm text-destructive outline-none"
                        >
                          {formError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={submitting}
                          aria-busy={submitting}
                        >
                          Guardar cambios
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={submitting}
                          onClick={cancelEditing}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-mono">Mi carrito</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <p className="font-sans text-sm text-muted-foreground">
                  {totalCount === 0
                    ? "Tu carrito está vacío."
                    : `${totalCount} ${totalCount === 1 ? "producto" : "productos"} por ${formatPriceCLP(totalAmount)}.`}
                </p>
                <Button type="button" variant="outline" onClick={openCart}>
                  Ver carrito
                </Button>
              </CardContent>
            </Card>

            <Card
              id="perfil-favoritos"
              ref={favoritesSectionRef}
              tabIndex={-1}
              aria-labelledby="perfil-favoritos-titulo"
              className="scroll-mt-20 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardHeader>
                <CardTitle id="perfil-favoritos-titulo" className="font-mono">
                  Favoritos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {favoriteError !== null && (
                  <p role="alert" className="font-sans text-sm text-destructive">
                    {favoriteError}
                  </p>
                )}
                {favoriteProducts.length === 0 ? (
                  <>
                    <p className="font-sans text-sm text-muted-foreground">
                      Aún no tienes favoritos. Marca el corazón en un producto
                      para guardarlo aquí.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="self-start"
                      asChild
                    >
                      <Link to="/catalogo">Explorar catálogo</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {favoritesPageData.pageItems.map((product) => (
                        <li key={product.id}>
                          <FavoriteProductCard
                            product={product}
                            onRemove={(productId) => {
                              void handleRemoveFavorite(productId);
                            }}
                            removeDisabled={favoritePending !== null}
                          />
                        </li>
                      ))}
                    </ul>
                    {favoritesPageData.totalPages > 1 && (
                      <nav
                        aria-label="Paginación de favoritos"
                        className="flex items-center gap-2"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={favoritesPageData.page <= 1}
                          onClick={() =>
                            setFavoritesPage(favoritesPageData.page - 1)
                          }
                          aria-label="Página anterior de favoritos"
                        >
                          Anterior
                        </Button>
                        <span className="font-sans text-sm text-muted-foreground">
                          Página {favoritesPageData.page} de{" "}
                          {favoritesPageData.totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            favoritesPageData.page >=
                            favoritesPageData.totalPages
                          }
                          onClick={() =>
                            setFavoritesPage(favoritesPageData.page + 1)
                          }
                          aria-label="Página siguiente de favoritos"
                        >
                          Siguiente
                        </Button>
                      </nav>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-mono">Historial</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {historyItems.length === 0 ? (
                  <>
                    <p className="font-sans text-sm text-muted-foreground">
                      Aún no visitaste productos. Tus últimas visitas
                      aparecerán aquí.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="self-start"
                      asChild
                    >
                      <Link to="/catalogo">Explorar catálogo</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        type="button"
                        aria-label="Ver visitas más recientes"
                        disabled={!canScrollHistoryLeft}
                        onClick={() => scrollHistory(-1)}
                        className="shrink-0"
                      >
                        <ChevronLeft aria-hidden="true" />
                      </Button>
                      <ul
                        ref={historyListRef}
                        onScroll={updateHistoryScrollEdges}
                        className="flex min-w-0 flex-1 snap-x gap-3 overflow-x-auto pb-2"
                      >
                        {visibleHistoryItems.map(({ product, viewedAt }) => (
                          <li
                            key={`${product.id}-${viewedAt}`}
                            className="w-64 shrink-0 snap-start"
                          >
                            <FavoriteProductCard
                              product={product}
                              viewedAtLabel={formatViewedAt(viewedAt)}
                            />
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        type="button"
                        aria-label="Ver visitas más antiguas"
                        disabled={!canScrollHistoryRight}
                        onClick={() => scrollHistory(1)}
                        className="shrink-0"
                      >
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </div>
                    {visibleHistoryItems.length < historyItems.length && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="self-start"
                        onClick={() =>
                          setVisibleHistoryCount(
                            (count) => count + HISTORY_PAGE_SIZE,
                          )
                        }
                      >
                        Cargar anteriores
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
