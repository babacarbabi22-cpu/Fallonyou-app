import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserWithPhotos } from "@/hooks/use-danceme";
import { useI18n, type Language } from "@/lib/i18n";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, MapPin, Briefcase, Ruler, GraduationCap, Star, Cigarette, Wine, Dumbbell, Baby, Users, PawPrint, Church, Vote, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface ProfileDetailSheetProps {
  user: UserWithPhotos | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  connectionAction?: ReactNode;
}

const relationshipTypeLabels: Record<Language, Record<string, string>> = {
  es: {
    friendship: "Amistad",
    travel: "Compañero de viaje",
    networking: "Contactos profesionales",
    language: "Intercambio de idiomas",
    activities: "Actividades",
  },
  en: {
    friendship: "Friendship",
    travel: "Travel companion",
    networking: "Networking",
    language: "Language exchange",
    activities: "Activities",
  },
  fr: {
    friendship: "Amitié",
    travel: "Compagnon de voyage",
    networking: "Réseautage",
    language: "Échange linguistique",
    activities: "Activités",
  },
  sv: {
    friendship: "Vänskap",
    travel: "Resesällskap",
    networking: "Nätverkande",
    language: "Språkutbyte",
    activities: "Aktiviteter",
  },
};

export function ProfileDetailSheet({ user, open, onOpenChange, onPrev, onNext, hasPrev, hasNext, connectionAction }: ProfileDetailSheetProps) {
  const { t, language } = useI18n();
  const reduceMotion = useReducedMotion();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const transitionDirection = useRef(1);

  useLayoutEffect(() => {
    // Keep the viewer open when moving to another person. Reset the photo
    // before the next frame so the new profile never shows the old index.
    setCurrentPhotoIndex(0);
  }, [user?.id]);

  useEffect(() => {
    if (!open) setLightboxOpen(false);
  }, [open]);

  const profile = user?.profile;
  const photos = user?.photos || [];
  const displayName = user?.firstName || "User";

  const nextPhoto = () => {
    if (photos.length > 1) {
      transitionDirection.current = 1;
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      transitionDirection.current = -1;
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  const getEducationLabel = (key: string) => {
    const educationMap: Record<string, string> = {
      highSchool: t.education.highSchool,
      someCollege: t.education.someCollege,
      bachelors: t.education.bachelors,
      masters: t.education.masters,
      doctorate: t.education.doctorate,
      tradeSchool: t.education.tradeSchool,
    };
    return educationMap[key] || key;
  };

  const getZodiacLabel = (key: string) => {
    const zodiacMap: Record<string, string> = {
      aries: t.zodiac.aries, taurus: t.zodiac.taurus, gemini: t.zodiac.gemini,
      cancer: t.zodiac.cancer, leo: t.zodiac.leo, virgo: t.zodiac.virgo,
      libra: t.zodiac.libra, scorpio: t.zodiac.scorpio, sagittarius: t.zodiac.sagittarius,
      capricorn: t.zodiac.capricorn, aquarius: t.zodiac.aquarius, pisces: t.zodiac.pisces,
    };
    return zodiacMap[key] || key;
  };

  const getLifestyleLabel = (key: string) => {
    const lifestyleMap: Record<string, string> = {
      never: t.lifestyle.never, sometimes: t.lifestyle.sometimes,
      regularly: t.lifestyle.regularly, socially: t.lifestyle.socially,
      active: t.lifestyle.active, daily: t.lifestyle.daily,
    };
    return lifestyleMap[key] || key;
  };

  const getChildrenLabel = (key: string) => {
    const childrenMap: Record<string, string> = {
      want: t.children.want, dontWant: t.children.dontWant,
      have: t.children.have, haveDone: t.children.haveDone, notSure: t.children.notSure,
    };
    return childrenMap[key] || key;
  };

  const getPetsLabel = (key: string) => {
    const petsMap: Record<string, string> = {
      dog: t.pets.dog, cat: t.pets.cat, both: t.pets.both,
      none: t.pets.none, other: t.pets.other,
    };
    return petsMap[key] || key;
  };

  const getRelationshipTypeLabel = (key: string) => {
    return relationshipTypeLabels[language][key] || key;
  };

  const getReligionLabel = (key: string) => {
    const map: Record<string, string> = {
      christian: t.religion?.christian || "Christian",
      muslim: t.religion?.muslim || "Muslim",
      jewish: t.religion?.jewish || "Jewish",
      hindu: t.religion?.hindu || "Hindu",
      buddhist: t.religion?.buddhist || "Buddhist",
      agnostic: t.religion?.agnostic || "Agnostic",
      atheist: t.religion?.atheist || "Atheist",
      other: t.religion?.other || "Other",
    };
    return map[key] || key;
  };

  const getPoliticsLabel = (key: string) => {
    const map: Record<string, string> = {
      liberal: t.politics?.liberal || "Liberal",
      moderate: t.politics?.moderate || "Moderate",
      conservative: t.politics?.conservative || "Conservative",
      apolitical: t.politics?.apolitical || "Apolitical",
      other: t.politics?.other || "Other",
    };
    return map[key] || key;
  };

  const getInterestLabel = (key: string) => {
    const interestMap: Record<string, string> = {
      music: t.interests?.music || "Music",
      movies: t.interests?.movies || "Movies",
      travel: t.interests?.travel || "Travel",
      reading: t.interests?.reading || "Reading",
      sports: t.interests?.sports || "Sports",
      gaming: t.interests?.gaming || "Gaming",
      cooking: t.interests?.cooking || "Cooking",
      art: t.interests?.art || "Art",
      photography: t.interests?.photography || "Photography",
      dancing: t.interests?.dancing || "Dancing",
      fitness: t.interests?.fitness || "Fitness",
      yoga: t.interests?.yoga || "Yoga",
      hiking: t.interests?.hiking || "Hiking",
      beach: t.interests?.beach || "Beach",
      coffee: t.interests?.coffee || "Coffee",
      wine: t.interests?.wine || "Wine",
      foodie: t.interests?.foodie || "Foodie",
      fashion: t.interests?.fashion || "Fashion",
      tech: t.interests?.tech || "Technology",
      nature: t.interests?.nature || "Nature",
      pets: t.interests?.pets || "Pets",
      volunteering: t.interests?.volunteering || "Volunteering",
    };
    return interestMap[key] || key;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" aria-describedby={undefined} className={connectionAction ? "h-[90dvh] max-h-[90dvh] rounded-t-3xl overflow-y-auto p-0 pb-[env(safe-area-inset-bottom)]" : "h-[90vh] rounded-t-3xl overflow-y-auto p-0"}>
          <SheetTitle className="sr-only">{displayName}</SheetTitle>
          {user ? (
            <motion.div
              key={user.id}
              className="relative"
              initial={reduceMotion ? false : { opacity: 0.55, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
            >
              {/* ── Close button ── */}
              <button
                onClick={() => onOpenChange(false)}
                 aria-label={t.common.close}
                data-testid="button-close-profile-sheet"
                className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                style={connectionAction ? { top: "max(0.75rem, env(safe-area-inset-top))" } : undefined}
              >
                <X size={20} />
              </button>

              {/* ── Profile prev/next navigation ── */}
              {(onPrev || onNext) && (
                <div className="absolute top-3 left-3 z-50 flex gap-2">
                  <button
                    onClick={onPrev}
                    disabled={!hasPrev}
                     aria-label="Perfil anterior"
                    data-testid="button-prev-profile"
                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                     aria-label="Perfil siguiente"
                    data-testid="button-next-profile"
                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              {/* ── Main photo ── */}
              <div className="relative h-[50vh] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`${user.id}-${currentPhotoIndex}`}
                    src={photos[currentPhotoIndex]?.url || photos[0]?.url || "/avatar-placeholder.svg"}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    loading="eager"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    data-testid="img-profile-photo"
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur text-white"
                      data-testid="button-prev-photo"
                    >
                      <ChevronLeft size={24} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur text-white"
                      data-testid="button-next-photo"
                    >
                      <ChevronRight size={24} />
                    </Button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {photos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPhotoIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${idx === currentPhotoIndex ? "bg-white w-4" : "bg-white/50"}`}
                          data-testid={`button-photo-dot-${idx}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                <div className="absolute bottom-8 left-4 text-white">
                  <h2 className="text-3xl font-bold" data-testid="text-profile-name">
                    {displayName}{profile?.age ? `, ${profile.age}` : ""}
                  </h2>
                </div>
              </div>

              {/* ── Profile info ── */}
              <div className="p-6 space-y-6">
                {connectionAction}
                {profile?.bio && (
                  <div>
                    <p className="text-lg text-foreground">{profile.bio}</p>
                  </div>
                )}

                {profile?.nextAdventure?.trim() && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
                      {t.engagement?.nextAdventure || "Mi próximo destino o plan"}
                    </h3>
                    <p className="text-foreground whitespace-pre-wrap break-words">{profile.nextAdventure}</p>
                  </div>
                )}

                {!!(profile?.favoriteDestinations?.length || profile?.notRecommendedDestinations?.length) && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">{t.profile.destinationRecommendations}</h3>
                    {!!profile?.favoriteDestinations?.length && (
                      <div>
                        <p className="text-sm font-medium mb-2">{t.profile.favoriteDestinations}</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.favoriteDestinations.map((destination, index) => (
                            <Badge variant="secondary" key={`${destination}-${index}`} className="whitespace-normal break-words">{destination}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {!!profile?.notRecommendedDestinations?.length && (
                      <div>
                        <p className="text-sm font-medium mb-2">{t.profile.notRecommendedDestinations}</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.notRecommendedDestinations.map((destination, index) => (
                            <Badge variant="outline" key={`${destination}-${index}`} className="whitespace-normal break-words">{destination}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {profile?.relationshipType && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails?.relationshipType || "Looking for"}</h3>
                    <Badge variant="default" className="flex items-center gap-1 w-fit">
                      <Users size={14} />
                      {getRelationshipTypeLabel(profile.relationshipType)}
                    </Badge>
                  </div>
                )}

                {profile?.interests && profile.interests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails?.interests || "Interests"}</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest: string) => (
                        <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                          <Star size={14} />
                          {getInterestLabel(interest)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(profile?.birthplace || profile?.occupation || profile?.height || profile?.education || profile?.zodiacSign) && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.basics}</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile?.birthplace && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MapPin size={14} />{profile.birthplace}
                        </Badge>
                      )}
                      {profile?.occupation && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Briefcase size={14} />{profile.occupation}
                        </Badge>
                      )}
                      {profile?.height && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Ruler size={14} />{profile.height} cm
                        </Badge>
                      )}
                      {profile?.education && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <GraduationCap size={14} />{getEducationLabel(profile.education)}
                        </Badge>
                      )}
                      {profile?.zodiacSign && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star size={14} />{getZodiacLabel(profile.zodiacSign)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {(profile?.smoking || profile?.drinking || profile?.exercise) && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.lifestyle}</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile?.smoking && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Cigarette size={14} />{t.profileDetails.smoking}: {getLifestyleLabel(profile.smoking)}
                        </Badge>
                      )}
                      {profile?.drinking && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Wine size={14} />{t.profileDetails.drinking}: {getLifestyleLabel(profile.drinking)}
                        </Badge>
                      )}
                      {profile?.exercise && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Dumbbell size={14} />{t.profileDetails.exercise}: {getLifestyleLabel(profile.exercise)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {(profile?.children || profile?.pets) && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.familyFuture}</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile?.children && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Baby size={14} />{getChildrenLabel(profile.children)}
                        </Badge>
                      )}
                      {profile?.pets && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <PawPrint size={14} />{getPetsLabel(profile.pets)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {(profile?.religion || profile?.politics) && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t.profileDetails.beliefs}</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile?.religion && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Church size={14} />{getReligionLabel(profile.religion)}
                        </Badge>
                      )}
                      {profile?.politics && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Vote size={14} />{getPoliticsLabel(profile.politics)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Quiero ayudar ── */}
                {(profile as any)?.wantToHelp && (profile as any)?.helpWith?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                      🤝 Quiere ayudar con
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {((profile as any).helpWith as string[]).map((item: string) => {
                        const labelMap: Record<string, string> = {
                          idiomas: "🌍 Idiomas",
                          alojamiento: "🏠 Alojamiento",
                          guia_local: "🗺️ Guía local",
                          trabajo: "💼 Trabajo/CV",
                          estudios: "📚 Estudios",
                          tecnologia: "🧑‍💻 Tecnología",
                          restaurantes: "🍽️ Restaurantes",
                          integracion: "🤝 Integración",
                          donaciones: "🎁 Donaciones",
                          transporte: "🚗 Transporte",
                          salud: "🏥 Salud",
                          finanzas: "💰 Finanzas",
                        };
                        return (
                          <Badge key={item} variant="secondary" className="text-xs">
                            {labelMap[item] || item}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Todas las fotos (siempre visible si hay al menos 1) ── */}
                {photos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      {t.profile.photos} ({photos.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo, idx) => (
                        <button
                          key={photo.id}
                          onClick={() => {
                            setCurrentPhotoIndex(idx);
                             setLightboxOpen(true);
                          }}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${idx === currentPhotoIndex ? "border-primary" : "border-transparent"}`}
                          data-testid={`button-photo-thumbnail-${idx}`}
                        >
                          <img
                            src={photo.url}
                            alt={`${displayName} foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra padding at bottom so last content isn't hidden */}
                <div className="h-6" />
              </div>
            </motion.div>
          ) : null}
          {/* El visor debe estar anidado en el Sheet: los diálogos modales bloquean
              los toques sobre elementos externos, aunque parezcan estar encima. */}
          <DialogPrimitive.Root open={lightboxOpen && open} onOpenChange={setLightboxOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/95" />
              <DialogPrimitive.Content
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white outline-none"
                aria-describedby={undefined}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") { event.preventDefault(); prevPhoto(); }
                  if (event.key === "ArrowRight") { event.preventDefault(); nextPhoto(); }
                }}
                onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                  if (touchStartX.current === null) return;
                  const distance = event.changedTouches[0].clientX - touchStartX.current;
                  touchStartX.current = null;
                  if (Math.abs(distance) < 50) return;
                  if (distance < 0) nextPhoto();
                  else prevPhoto();
                }}
                data-testid="lightbox-overlay"
              >
                <DialogPrimitive.Title className="sr-only">
                  {displayName} — {t.profile.photos}
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white"
                  style={{ top: "max(16px, env(safe-area-inset-top))" }}
                  aria-label="Cerrar foto y volver al perfil"
                  data-testid="button-close-lightbox"
                >
                  <X size={24} />
                </DialogPrimitive.Close>
                <div className="relative h-[72dvh] w-full overflow-hidden">
                  <AnimatePresence initial={false}>
                    <motion.img
                      key={`${user?.id}-${currentPhotoIndex}`}
                      src={photos[currentPhotoIndex]?.url || photos[0]?.url}
                      alt={`${displayName}, foto ${currentPhotoIndex + 1} de ${photos.length}`}
                      className="absolute inset-0 h-full w-full object-contain"
                      initial={reduceMotion ? false : { opacity: 0, x: transitionDirection.current * 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -transitionDirection.current * 24 }}
                      transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
                      data-testid="img-lightbox-photo"
                    />
                  </AnimatePresence>
                </div>
                <p className="absolute top-6 left-4 right-20 truncate text-sm font-semibold" style={{ paddingTop: "env(safe-area-inset-top)" }}>
                  {displayName}
                </p>
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevPhoto}
                      className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20"
                      aria-label="Foto anterior"
                      data-testid="button-lightbox-prev-photo"
                    >
                      <ChevronLeft size={28} />
                    </button>
                    <button
                      type="button"
                      onClick={nextPhoto}
                      className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20"
                      aria-label="Foto siguiente"
                      data-testid="button-lightbox-next-photo"
                    >
                      <ChevronRight size={28} />
                    </button>
                  </>
                )}
                <div
                  className="absolute inset-x-0 flex flex-col items-center gap-3"
                  style={{ bottom: "max(20px, env(safe-area-inset-bottom))" }}
                >
                  {photos.length > 1 && (
                    <span className="text-sm text-white/80" aria-live="polite">
                      {currentPhotoIndex + 1} / {photos.length}
                    </span>
                  )}
                  <DialogPrimitive.Close className="rounded-full bg-white/20 px-5 py-3 text-sm font-semibold" data-testid="button-back-to-profile">
                    Volver al perfil
                  </DialogPrimitive.Close>
                  {(hasPrev || hasNext) && (
                    <div className="flex gap-3">
                      {hasPrev && (
                        <button
                          type="button"
                          onClick={() => { transitionDirection.current = -1; onPrev?.(); }}
                          className="rounded-full bg-white/20 px-4 py-2 text-sm"
                          data-testid="button-lightbox-prev-profile"
                        >
                          ← Perfil anterior
                        </button>
                      )}
                      {hasNext && (
                        <button
                          type="button"
                          onClick={() => { transitionDirection.current = 1; onNext?.(); }}
                          className="rounded-full bg-white/20 px-4 py-2 text-sm"
                          data-testid="button-lightbox-next-profile"
                        >
                          Perfil siguiente →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </SheetContent>
      </Sheet>
    </>
  );
}
