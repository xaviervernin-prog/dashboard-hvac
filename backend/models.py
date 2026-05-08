from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class Counter(Base):
    __tablename__ = "counters"
    id = Column(String, primary_key=True)
    value = Column(Integer, default=1)


class Categorie(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, unique=True, nullable=False)


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, default="")
    ent = Column(String, default="")
    tel = Column(String, default="")
    email = Column(String, default="")
    statut = Column(String, default="prospect")
    fact_rue = Column(String, default="")
    fact_ville = Column(String, default="")
    fact_pays = Column(String, default="UAE")
    chantiers = relationship("Chantier", back_populates="client", cascade="all, delete-orphan")
    devis = relationship("Devis", back_populates="client")
    factures = relationship("Facture", back_populates="client")


class Chantier(Base):
    __tablename__ = "chantiers"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    nom = Column(String, default="")
    adresse = Column(String, default="")
    c_nom = Column(String, default="")
    c_prenom = Column(String, default="")
    c_tel = Column(String, default="")
    client = relationship("Client", back_populates="chantiers")


class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    ref = Column(String, unique=True, nullable=False)
    nom = Column(String, nullable=False)
    cat = Column(String, default="")
    desc = Column(Text, default="")
    prix = Column(Float, default=0.0)
    stock = Column(Integer, default=0)


class Devis(Base):
    __tablename__ = "devis"
    id = Column(Integer, primary_key=True, index=True)
    num = Column(String, unique=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    objet = Column(String, default="")
    date = Column(String, default="")
    montant = Column(Float, default=0.0)
    statut = Column(String, default="en_attente")
    relance_date = Column(String, nullable=True)
    client = relationship("Client", back_populates="devis")
    lignes = relationship("DevisLigne", back_populates="devis", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="devis")


class DevisLigne(Base):
    __tablename__ = "devis_lignes"
    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis.id"), nullable=False)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=True)
    qty = Column(Integer, default=1)
    prix = Column(Float, default=0.0)
    devis = relationship("Devis", back_populates="lignes")
    article = relationship("Article")


class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis.id"), nullable=True)
    date = Column(String, nullable=False)
    hd = Column(String, default="08:00")
    hf = Column(String, default="10:00")
    lieu = Column(String, default="")
    tech = Column(String, default="")
    notes = Column(Text, default="")
    statut = Column(String, default="planifiee")
    montant = Column(Float, default=0.0)
    devis = relationship("Devis", back_populates="interventions")


class Facture(Base):
    __tablename__ = "factures"
    id = Column(Integer, primary_key=True, index=True)
    num = Column(String, unique=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    devis_ref = Column(String, default="")
    date = Column(String, default="")
    echeance = Column(String, default="")
    montant = Column(Float, default=0.0)
    statut = Column(String, default="en_attente")
    relance_date = Column(String, nullable=True)
    client = relationship("Client", back_populates="factures")


class Profil(Base):
    __tablename__ = "profil"
    id = Column(Integer, primary_key=True, default=1)
    nom = Column(String, default="")
    prenom = Column(String, default="")
    tel = Column(String, default="")
    permis = Column(String, default="")
    permis_exp = Column(String, default="")
    vehicle = Column(String, default="")
    photo_b64 = Column(Text, default="")
